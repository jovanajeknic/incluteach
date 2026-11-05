import type pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../app.ts';
import { createPool } from '../db/pool.ts';
import { FAST_HASH_COST, inRolledBackTransaction } from '../db/testUtils.ts';
import { sessionCookie } from '../routes/testHelpers.ts';
import { demoExists, removeDemo, seedDemo, type DemoSeed } from './seedDemo.ts';

const PASSWORD = 'demo-lozinka-test';

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('the demo school', () => {
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  // Runs a test with a freshly made demo school; everything is rolled back afterwards, also a
  // demo school that was already in the database.
  const withDemo = (run: (context: { client: pg.PoolClient; seed: DemoSeed }) => Promise<void>) =>
    inRolledBackTransaction(pool, async (client) => {
      await removeDemo(client);
      const seed = await seedDemo(client, { password: PASSWORD, cost: FAST_HASH_COST });
      await run({ client, seed });
    });

  const app = (client: pg.PoolClient) => createApp({ pool: client, passwordCost: FAST_HASH_COST });

  // Signs in as the demo person with this role and name, and returns their requests.
  async function signIn(client: pg.PoolClient, seed: DemoSeed, fullName: string) {
    const account = seed.accounts.find((entry) => entry.fullName === fullName);
    if (!account) {
      throw new Error(`There is no demo account for ${fullName}.`);
    }
    const server = app(client);
    const login = await request(server)
      .post('/auth/login')
      .send({ identifier: account.username, password: seed.password });
    expect(login.status, `${fullName} signs in`).toBe(200);
    const cookie = sessionCookie(login);
    return { get: (path: string) => request(server).get(path).set('Cookie', cookie) };
  }

  it('makes a school with an admin, two teachers, two students and three parents', async () => {
    await withDemo(async ({ seed }) => {
      const roles = seed.accounts.map((account) => account.role).sort();

      expect(roles).toEqual([
        'admin',
        'parent',
        'parent',
        'parent',
        'student',
        'student',
        'teacher',
        'teacher',
      ]);
      expect(new Set(seed.accounts.map((account) => account.username)).size).toBe(8);
      expect(seed.password).toBe(PASSWORD);
    });
  });

  it('lets every demo person sign in with the one password', async () => {
    await withDemo(async ({ client, seed }) => {
      for (const account of seed.accounts) {
        await signIn(client, seed, account.fullName);
      }
    });
  });

  it('shows the teacher her lessons, with a draft among them', async () => {
    await withDemo(async ({ client, seed }) => {
      const teacher = await signIn(client, seed, 'Milica Petrović');

      const response = await teacher.get('/lessons');

      expect(response.status).toBe(200);
      const byTitle = new Map<string, string>(
        response.body.lessons.map((lesson: { title: string; status: string }) => [
          lesson.title,
          lesson.status,
        ]),
      );
      expect(Object.fromEntries(byTitle)).toEqual({
        Fotosinteza: 'published',
        'Biljke i voda': 'published',
        Ćelija: 'draft',
      });
    });
  });

  it('shows each student only the published lessons of the subjects they joined', async () => {
    await withDemo(async ({ client, seed }) => {
      const ana = await signIn(client, seed, 'Ana Marković');
      const luka = await signIn(client, seed, 'Luka Stanić');

      const titles = async (person: typeof ana) =>
        (await person.get('/lessons')).body.lessons
          .map((lesson: { title: string }) => lesson.title)
          .sort();

      expect(await titles(ana)).toEqual(['Biljke i voda', 'Fotosinteza', 'Круг воде у природи']);
      expect(await titles(luka)).toEqual(['Biljke i voda', 'Fotosinteza']);
    });
  });

  it('has an approved summary and quiz on the lessons that should have them', async () => {
    await withDemo(async ({ client, seed }) => {
      const ana = await signIn(client, seed, 'Ana Marković');
      const { lessons } = (await ana.get('/lessons')).body;
      const lessonOf = async (title: string) => {
        const id = lessons.find((lesson: { title: string }) => lesson.title === title).id;
        return (await ana.get(`/lessons/${id}`)).body.lesson;
      };

      const photosynthesis = await lessonOf('Fotosinteza');
      expect(photosynthesis.summary.points).toHaveLength(5);
      expect(photosynthesis.quiz.questions).toHaveLength(5);
      // A student never gets the right answers.
      expect(JSON.stringify(photosynthesis.quiz)).not.toContain('isCorrect');

      const water = await lessonOf('Biljke i voda');
      expect(water.summary.points).toHaveLength(2);
      expect(water.quiz).toBeNull();

      const cyrillic = await lessonOf('Круг воде у природи');
      expect(cyrillic.body).toMatch(/^Круг воде/);
      expect(cyrillic.quiz.questions).toHaveLength(3);
    });
  });

  it('has Ana already finished a lesson, with an automatic star and one from the teacher', async () => {
    await withDemo(async ({ client, seed }) => {
      const ana = await signIn(client, seed, 'Ana Marković');
      const { lessons } = (await ana.get('/lessons')).body;
      const id = lessons.find((lesson: { title: string }) => lesson.title === 'Biljke i voda').id;

      const lesson = (await ana.get(`/lessons/${id}`)).body.lesson;
      const stars = (await ana.get('/stars')).body;

      expect(lesson.myProgress.completed).toBe(true);
      expect(stars.counts).toEqual({ automatic: 1, teacher: 1 });
    });
  });

  it('gives both parents of Ana the same conversation with the teacher', async () => {
    await withDemo(async ({ client, seed }) => {
      const ana = seed.accounts.find((account) => account.fullName === 'Ana Marković');
      const { rows } = await client.query<{ id: string }>(
        'SELECT id FROM users WHERE username = $1',
        [ana?.username],
      );
      const subject = (
        await client.query<{ id: string }>(
          "SELECT id FROM subjects WHERE name = 'Biologija' AND school_id = $1",
          [seed.schoolId],
        )
      ).rows[0].id;
      const query = `/conversations/messages?studentId=${rows[0].id}&subjectId=${subject}`;

      for (const parent of ['Petar Marković', 'Jelena Marković']) {
        const person = await signIn(client, seed, parent);
        const response = await person.get(query);

        expect(response.status, parent).toBe(200);
        expect(
          response.body.messages.map(
            (message: { author: { role: string } }) => message.author.role,
          ),
        ).toEqual(['teacher', 'parent']);
      }
      const other = await signIn(client, seed, 'Dragana Stanić');
      expect((await other.get(query)).status).toBe(403);
    });
  });

  it("leaves Luka's request for Geography waiting for his parent", async () => {
    await withDemo(async ({ client, seed }) => {
      const { rows } = await client.query<{ status: string; count: string }>(
        `SELECT status, count(*) FROM enrollments WHERE school_id = $1 GROUP BY status`,
        [seed.schoolId],
      );

      expect(Object.fromEntries(rows.map((row) => [row.status, Number(row.count)]))).toEqual({
        approved: 3,
        awaiting_parent: 1,
      });
    });
  });

  it('is deleted with everything in it, and can be made again', async () => {
    await inRolledBackTransaction(pool, async (client) => {
      await removeDemo(client);
      expect(await demoExists(client)).toBe(false);

      const first = await seedDemo(client, { password: PASSWORD, cost: FAST_HASH_COST });
      expect(await demoExists(client)).toBe(true);

      expect(await removeDemo(client)).toBe(true);
      expect(await demoExists(client)).toBe(false);
      for (const table of ['users', 'subjects', 'lessons', 'stars', 'conversation_messages']) {
        const { rows } = await client.query(`SELECT 1 FROM ${table} WHERE school_id = $1`, [
          first.schoolId,
        ]);
        expect(rows, table).toHaveLength(0);
      }
      expect(await removeDemo(client)).toBe(false);

      const second = await seedDemo(client, { password: PASSWORD, cost: FAST_HASH_COST });
      expect(second.accounts.map((account) => account.username)).toEqual(
        first.accounts.map((account) => account.username),
      );
    });
  });

  it('does not touch another school', async () => {
    await inRolledBackTransaction(pool, async (client) => {
      const { rows } = await client.query<{ id: string }>(
        "INSERT INTO schools (name) VALUES ('Neka druga škola') RETURNING id",
      );
      await removeDemo(client);
      await seedDemo(client, { password: PASSWORD, cost: FAST_HASH_COST });

      await removeDemo(client);

      const stillThere = await client.query('SELECT 1 FROM schools WHERE id = $1', [rows[0].id]);
      expect(stillThere.rows).toHaveLength(1);
    });
  });
});

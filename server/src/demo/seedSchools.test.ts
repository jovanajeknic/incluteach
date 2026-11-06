import type pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../app.ts';
import { verifyPassword } from '../auth/password.ts';
import { createPool } from '../db/pool.ts';
import { FAST_HASH_COST } from '../db/testUtils.ts';
import { sessionCookie } from '../routes/testHelpers.ts';
import { seedDemo } from './seedDemo.ts';
import { seedSchools, wipeAllData, type SchoolsSeed } from './seedSchools.ts';

const PASSWORD = 'password';

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('the schools seed', () => {
  let pool: pg.Pool;
  let client: pg.PoolClient;
  let seed: SchoolsSeed;

  // Making the schools takes some seconds, so it is done once, in one transaction that is rolled
  // back at the end. The tests only look; the last one wipes and makes the schools again.
  beforeAll(async () => {
    pool = createPool();
    client = await pool.connect();
    await client.query('BEGIN');
    await wipeAllData(client);
    seed = await seedSchools(client, { password: PASSWORD, cost: FAST_HASH_COST });
  }, 120_000);

  afterAll(async () => {
    await client.query('ROLLBACK');
    client.release();
    await pool.end();
  });

  const withSchools = (
    run: (context: { client: pg.PoolClient; seed: SchoolsSeed }) => Promise<void>,
  ) => run({ client, seed });

  async function rows<T>(client: pg.PoolClient, sql: string, params: unknown[] = []) {
    return (await client.query(sql, params)).rows as T[];
  }

  async function count(client: pg.PoolClient, sql: string, params: unknown[] = []) {
    return (await rows<{ n: number }>(client, sql, params))[0].n;
  }

  it('makes four schools, each with an admin with an easy name', async () => {
    await withSchools(async ({ seed }) => {
      expect(seed.schools.map((school) => [school.name, school.admin.username])).toEqual([
        ['OŠ Dragiša Ivanović', 'admin_dragisa'],
        ['OŠ Štampar Makarije', 'admin_stampar'],
        ['OŠ Maksim Gorki', 'admin_gorki'],
        ['OŠ Vladimir Nazor', 'admin_nazor'],
      ]);
    });
  });

  it('gives people to the first school only', async () => {
    await withSchools(async ({ client, seed }) => {
      const byRole = await rows<{ school: string; role: string; n: number }>(
        client,
        `SELECT s.name AS school, u.role, count(*)::int AS n
         FROM users u JOIN schools s ON s.id = u.school_id GROUP BY s.name, u.role`,
      );
      const of = (school: string) =>
        Object.fromEntries(
          byRole.filter((row) => row.school === school).map((row) => [row.role, row.n]),
        );

      expect(of('OŠ Dragiša Ivanović')).toMatchObject({ admin: 1, teacher: 4, student: 24 });
      expect(of('OŠ Dragiša Ivanović').parent).toBeGreaterThan(24);
      for (const school of ['OŠ Štampar Makarije', 'OŠ Maksim Gorki', 'OŠ Vladimir Nazor']) {
        expect(of(school), school).toEqual({ admin: 1 });
      }
      expect(seed.main.classes.map((entry) => entry.name)).toEqual(['6-1', '6-2', '7-1']);
    });
  });

  it('gives every account a distinct username, the one password and an email', async () => {
    await withSchools(async ({ client }) => {
      const users = await rows<{ username: string; password_hash: string | null; email: string }>(
        client,
        'SELECT username, password_hash, email FROM users',
      );

      expect(new Set(users.map((user) => user.username)).size).toBe(users.length);
      for (const user of users) {
        expect(user.email, user.username).toBeTruthy();
        expect(await verifyPassword(PASSWORD, user.password_hash as string), user.username).toBe(
          true,
        );
      }
    });
  });

  it('lets an admin, a teacher, a student and a parent sign in', async () => {
    await withSchools(async ({ client, seed }) => {
      const student = seed.main.classes[0].students[0];
      const server = createApp({ pool: client, passwordCost: FAST_HASH_COST });

      for (const account of [
        seed.schools[0].admin,
        seed.main.teachers.math,
        student.user,
        student.parents[0],
      ]) {
        const login = await request(server)
          .post('/auth/login')
          .send({ identifier: account.username, password: PASSWORD });

        expect(login.status, account.role).toBe(200);
        expect(sessionCookie(login)).toBeTruthy();
      }
    });
  });

  it('links students to one or two parents, with two pairs of siblings sharing theirs', async () => {
    await withSchools(async ({ client, seed }) => {
      const students = seed.main.classes.flatMap((entry) => entry.students);
      const sizes = new Set(students.map((student) => student.parents.length));
      expect([...sizes].sort()).toEqual([1, 2]);

      const links = await rows<{ parent: string; n: number }>(
        client,
        'SELECT parent_id AS parent, count(*)::int AS n FROM parent_students GROUP BY parent_id',
      );
      // Two families with two children and two parents each: four parents with two children.
      expect(links.filter((link) => link.n === 2)).toHaveLength(4);
      // A parent never has the name of their own child.
      for (const student of students) {
        for (const parent of student.parents) {
          expect(parent.fullName).not.toBe(student.user.fullName);
        }
      }
    });
  });

  it('puts Matematika and Biologija, with lessons, in every odeljenje', async () => {
    await withSchools(async ({ client }) => {
      const lessons = await rows<{ class: string; subject: string; status: string; n: number }>(
        client,
        `SELECT c.name AS class, s.name AS subject, l.status, count(*)::int AS n
         FROM lessons l JOIN subjects s ON s.id = l.subject_id JOIN classes c ON c.id = s.class_id
         GROUP BY c.name, s.name, l.status`,
      );
      const of = (className: string, subject: string, status: string) =>
        lessons.find(
          (row) => row.class === className && row.subject === subject && row.status === status,
        )?.n;

      for (const className of ['6-1', '6-2', '7-1']) {
        expect(of(className, 'Matematika', 'published'), className).toBe(5);
        expect(of(className, 'Biologija', 'published'), className).toBe(5);
        expect(of(className, 'Matematika', 'draft'), className).toBe(1);
        expect(of(className, 'Biologija', 'draft'), className).toBe(1);
      }
      expect(of('6-1', 'Srpski jezik', 'published')).toBe(1);
      expect(of('6-1', 'Istorija', 'published')).toBe(1);
      expect(of('6-2', 'Istorija', 'published')).toBeUndefined();
    });
  });

  it('has requests in every state, from students and from parents', async () => {
    await withSchools(async ({ client }) => {
      const byStatus = Object.fromEntries(
        (
          await rows<{ status: string; n: number }>(
            client,
            'SELECT status, count(*)::int AS n FROM enrollments GROUP BY status',
          )
        ).map((row) => [row.status, row.n]),
      );

      for (const status of ['approved', 'awaiting_parent', 'awaiting_teacher', 'rejected']) {
        expect(byStatus[status], status).toBeGreaterThan(3);
      }
      expect(
        await count(
          client,
          "SELECT count(*)::int AS n FROM enrollments WHERE requested_by_role = 'parent'",
        ),
      ).toBeGreaterThan(0);
      // Rejected by the parent and by the teacher.
      expect(
        await count(
          client,
          "SELECT count(*)::int AS n FROM enrollments WHERE status = 'rejected' AND teacher_decided_by IS NULL",
        ),
      ).toBeGreaterThan(0);
      expect(
        await count(
          client,
          "SELECT count(*)::int AS n FROM enrollments WHERE status = 'rejected' AND teacher_decided_by IS NOT NULL",
        ),
      ).toBeGreaterThan(0);
    });
  });

  it('has finished lessons, quiz tries that went right and wrong, and both kinds of stars', async () => {
    await withSchools(async ({ client }) => {
      expect(
        await count(client, 'SELECT count(*)::int AS n FROM lesson_completions'),
      ).toBeGreaterThan(40);
      expect(
        await count(client, 'SELECT count(*)::int AS n FROM quiz_attempts WHERE all_correct'),
      ).toBeGreaterThan(5);
      expect(
        await count(client, 'SELECT count(*)::int AS n FROM quiz_attempts WHERE NOT all_correct'),
      ).toBeGreaterThan(5);
      for (const source of ['automatic', 'teacher']) {
        expect(
          await count(client, 'SELECT count(*)::int AS n FROM stars WHERE source = $1', [source]),
          source,
        ).toBeGreaterThan(10);
      }
    });
  });

  it('has conversations of teachers and parents, in turns, about students who joined', async () => {
    await withSchools(async ({ client }) => {
      expect(
        await count(client, 'SELECT count(*)::int AS n FROM conversation_messages'),
      ).toBeGreaterThan(40);
      const roles = await rows<{ author_role: string }>(
        client,
        'SELECT DISTINCT author_role FROM conversation_messages',
      );
      expect(roles.map((row) => row.author_role).sort()).toEqual(['parent', 'teacher']);
    });
  });

  it('spreads the activity over the last weeks, none of it in the future', async () => {
    await withSchools(async ({ client }) => {
      for (const [table, column] of [
        ['conversation_messages', 'created_at'],
        ['stars', 'created_at'],
        ['enrollments', 'created_at'],
        ['lesson_completions', 'completed_at'],
        ['quiz_attempts', 'started_at'],
        ['lessons', 'published_at'],
      ]) {
        const [range] = await rows<{ days: number; future: number }>(
          client,
          `SELECT (extract(epoch FROM now() - min(${column})) / 86400)::int AS days,
                  count(*) FILTER (WHERE ${column} > now() + interval '1 minute')::int AS future
           FROM ${table}`,
        );
        expect(range.future, table).toBe(0);
        expect(range.days, table).toBeGreaterThan(5);
      }
    });
  });

  it('shows a teacher her lessons, and a parent a conversation with the teacher', async () => {
    await withSchools(async ({ client, seed }) => {
      const server = createApp({ pool: client, passwordCost: FAST_HASH_COST });
      const signIn = async (username: string) => {
        const login = await request(server)
          .post('/auth/login')
          .send({ identifier: username, password: PASSWORD });
        return sessionCookie(login);
      };

      const teacher = await signIn(seed.main.teachers.math.username);
      const lessons = await request(server).get('/lessons').set('Cookie', teacher);
      expect(lessons.status).toBe(200);
      expect(lessons.body.lessons.length).toBeGreaterThanOrEqual(15);

      const talk = await rows<{ student_id: string; subject_id: string; author_id: string }>(
        client,
        `SELECT m.student_id, m.subject_id, m.author_id FROM conversation_messages m
         JOIN users a ON a.id = m.author_id WHERE a.role = 'parent' LIMIT 1`,
      );
      const [parent] = await rows<{ username: string }>(
        client,
        'SELECT username FROM users WHERE id = $1',
        [talk[0].author_id],
      );
      const conversation = await request(server)
        .get(
          `/conversations/messages?studentId=${talk[0].student_id}&subjectId=${talk[0].subject_id}`,
        )
        .set('Cookie', await signIn(parent.username));
      expect(conversation.status).toBe(200);
      expect(conversation.body.messages.length).toBeGreaterThanOrEqual(3);
    });
  });

  // Last, because it wipes what the other tests look at.
  it('wipes everything, also the small demo school, and can be made again', async () => {
    await seedDemo(client, { password: PASSWORD, cost: FAST_HASH_COST });
    await wipeAllData(client);

    for (const table of ['schools', 'users', 'classes', 'subjects', 'lessons', 'stars']) {
      expect(await count(client, `SELECT count(*)::int AS n FROM ${table}`), table).toBe(0);
    }

    const again = await seedSchools(client, { password: PASSWORD, cost: FAST_HASH_COST });

    expect(again.main.classes.map((entry) => entry.students.map((s) => s.user.username))).toEqual(
      seed.main.classes.map((entry) => entry.students.map((s) => s.user.username)),
    );
  }, 60_000);
});

import type pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../app.ts';
import { verifyPassword } from '../auth/password.ts';
import { createPool } from '../db/pool.ts';
import { FAST_HASH_COST, inRolledBackTransaction } from '../db/testUtils.ts';
import { sessionCookie } from '../routes/testHelpers.ts';
import { seedDemo } from './seedDemo.ts';
import { seedPodgorica, wipeAllData, type PodgoricaSeed } from './seedPodgorica.ts';

const PASSWORD = 'password';

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('the schools of Podgorica', () => {
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  // Runs a test with freshly made schools; everything is rolled back afterwards.
  const withSchools = (
    run: (context: { client: pg.PoolClient; seed: PodgoricaSeed }) => Promise<void>,
  ) =>
    inRolledBackTransaction(pool, async (client) => {
      await wipeAllData(client);
      const seed = await seedPodgorica(client, { password: PASSWORD, cost: FAST_HASH_COST });
      await run({ client, seed });
    });

  async function count(client: pg.PoolClient, sql: string, params: unknown[] = []) {
    const { rows } = await client.query<{ n: number }>(sql, params);
    return rows[0].n;
  }

  it('makes six schools, each with one admin, three teachers and twelve students', async () => {
    await withSchools(async ({ client, seed }) => {
      expect(seed.schools).toHaveLength(6);
      for (const school of seed.schools) {
        const roles = await client.query<{ role: string; n: number }>(
          'SELECT role, count(*)::int AS n FROM users WHERE school_id = $1 GROUP BY role',
          [school.id],
        );
        const byRole = Object.fromEntries(roles.rows.map((row) => [row.role, row.n]));

        expect(byRole, school.name).toMatchObject({ admin: 1, teacher: 3, student: 12 });
        // One parent for some students and two for others, so more than 12 and fewer than 24.
        expect(byRole.parent).toBeGreaterThan(12);
        expect(byRole.parent).toBeLessThan(24);
      }
    });
  });

  it('gives every account a distinct username, the one password and an email', async () => {
    await withSchools(async ({ client }) => {
      const { rows } = await client.query<{ username: string; password_hash: string | null }>(
        'SELECT username, password_hash FROM users',
      );

      expect(new Set(rows.map((row) => row.username)).size).toBe(rows.length);
      for (const row of rows) {
        expect(row.password_hash, row.username).not.toBeNull();
        expect(await verifyPassword(PASSWORD, row.password_hash as string), row.username).toBe(
          true,
        );
      }
      expect(await count(client, 'SELECT count(*)::int AS n FROM users WHERE email IS NULL')).toBe(
        0,
      );
    });
  });

  it('lets an admin, a teacher, a student and a parent sign in', async () => {
    await withSchools(async ({ client, seed }) => {
      const school = seed.schools[0];
      const student = school.classes[0].students[0];
      const server = createApp({ pool: client, passwordCost: FAST_HASH_COST });

      for (const account of [school.admin, school.teachers[0], student, student.parents[0]]) {
        const login = await request(server)
          .post('/auth/login')
          .send({ identifier: account.username, password: PASSWORD });

        expect(login.status, account.role).toBe(200);
        expect(sessionCookie(login)).toBeTruthy();
      }
    });
  });

  it('has two grades of two odeljenja in each school, with three subjects in each', async () => {
    await withSchools(async ({ seed }) => {
      for (const school of seed.schools) {
        expect(school.classes, school.name).toHaveLength(4);
        const grades = new Set(school.classes.map((entry) => entry.name.split('-')[0]));
        expect(grades.size, school.name).toBe(2);

        for (const schoolClass of school.classes) {
          expect(schoolClass.students).toHaveLength(3);
          expect(schoolClass.subjects).toHaveLength(3);
          // Three different teachers, one for each subject.
          expect(
            new Set(schoolClass.subjects.map((subject) => subject.teacher.username)).size,
          ).toBe(3);
        }
      }
    });
  });

  it('links every student to one or two parents, and both cases occur', async () => {
    await withSchools(async ({ client, seed }) => {
      const sizes = new Set<number>();
      for (const school of seed.schools) {
        for (const schoolClass of school.classes) {
          for (const student of schoolClass.students) {
            sizes.add(student.parents.length);
            const linked = await count(
              client,
              'SELECT count(*)::int AS n FROM parent_students WHERE student_id = (SELECT id FROM users WHERE username = $1)',
              [student.username],
            );
            expect(linked, student.username).toBe(student.parents.length);
            // Not a parent with the very same name as the child.
            for (const parent of student.parents) {
              expect(parent.fullName, student.username).not.toBe(student.fullName);
            }
          }
        }
      }

      expect([...sizes].sort()).toEqual([1, 2]);
    });
  });

  it('keeps the schools apart: nobody is linked or taught across schools', async () => {
    await withSchools(async ({ client }) => {
      const crossed = await count(
        client,
        `SELECT count(*)::int AS n FROM subjects s
         JOIN users t ON t.id = s.teacher_id WHERE t.school_id <> s.school_id`,
      );

      expect(crossed).toBe(0);
    });
  });

  it('leaves no enrollments, lessons or messages, so those flows can be tried from the start', async () => {
    await withSchools(async ({ client }) => {
      for (const table of ['enrollments', 'lessons', 'conversation_messages', 'stars']) {
        expect(await count(client, `SELECT count(*)::int AS n FROM ${table}`), table).toBe(0);
      }
    });
  });

  it('wipes everything, also the small demo school, and can be made again', async () => {
    await inRolledBackTransaction(pool, async (client) => {
      await seedDemo(client, { password: PASSWORD, cost: FAST_HASH_COST });
      await wipeAllData(client);

      for (const table of ['schools', 'users', 'classes', 'subjects', 'lessons', 'stars']) {
        expect(await count(client, `SELECT count(*)::int AS n FROM ${table}`), table).toBe(0);
      }

      const first = await seedPodgorica(client, { password: PASSWORD, cost: FAST_HASH_COST });
      await wipeAllData(client);
      const second = await seedPodgorica(client, { password: PASSWORD, cost: FAST_HASH_COST });
      expect(second.schools.map((school) => school.admin.username)).toEqual(
        first.schools.map((school) => school.admin.username),
      );
    });
  });
});

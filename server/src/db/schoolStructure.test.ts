import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPool } from './pool.ts';
import {
  inRolledBackTransaction,
  insertClass,
  insertSchool,
  insertSubject,
  insertUser,
} from './testUtils.ts';

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('schools, classes and subjects', () => {
  // Created in beforeAll because describe bodies run even when the suite is skipped.
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  const inTransaction = (run: (client: pg.PoolClient) => Promise<void>) =>
    inRolledBackTransaction(pool, run);

  describe('users', () => {
    it('require a school', async () => {
      await inTransaction(async (client) => {
        await expect(
          client.query(`INSERT INTO users (full_name, role) VALUES ('Test User', 'teacher')`),
        ).rejects.toThrow(/null value in column "school_id"/);
      });
    });

    it('cannot belong to a school that does not exist', async () => {
      await inTransaction(async (client) => {
        await expect(
          insertUser(client, '00000000-0000-0000-0000-000000000000', 'teacher'),
        ).rejects.toThrow(/violates foreign key constraint/);
      });
    });
  });

  describe('classes', () => {
    it('allow the same class name in a different school year', async () => {
      await inTransaction(async (client) => {
        const schoolId = await insertSchool(client);
        await insertClass(client, schoolId, '5-2', 2026);

        await expect(insertClass(client, schoolId, '5-2', 2027)).resolves.toBeTruthy();
      });
    });

    it('allow the same class name in a different school', async () => {
      await inTransaction(async (client) => {
        await insertClass(client, await insertSchool(client, 'School A'), '5-2', 2026);

        await expect(
          insertClass(client, await insertSchool(client, 'School B'), '5-2', 2026),
        ).resolves.toBeTruthy();
      });
    });

    it('reject a duplicate class name in the same school and year', async () => {
      await inTransaction(async (client) => {
        const schoolId = await insertSchool(client);
        await insertClass(client, schoolId, '5-2', 2026);

        await expect(insertClass(client, schoolId, '5-2', 2026)).rejects.toThrow(
          /duplicate key value violates unique constraint/,
        );
      });
    });

    it('reject an implausible school year', async () => {
      await inTransaction(async (client) => {
        const schoolId = await insertSchool(client);

        await expect(insertClass(client, schoolId, '5-2', 26)).rejects.toThrow(
          /violates check constraint/,
        );
      });
    });
  });

  describe('subjects', () => {
    it('accept a teacher and a class from the same school', async () => {
      await inTransaction(async (client) => {
        const schoolId = await insertSchool(client);
        const teacherId = await insertUser(client, schoolId, 'teacher');
        const classId = await insertClass(client, schoolId);

        await expect(insertSubject(client, schoolId, classId, teacherId)).resolves.toBeTruthy();
      });
    });

    it.each(['admin', 'student', 'parent'] as const)(
      'reject a user with the role "%s" as the teacher',
      async (role) => {
        await inTransaction(async (client) => {
          const schoolId = await insertSchool(client);
          const notATeacherId = await insertUser(client, schoolId, role);
          const classId = await insertClass(client, schoolId);

          await expect(insertSubject(client, schoolId, classId, notATeacherId)).rejects.toThrow(
            /violates foreign key constraint/,
          );
        });
      },
    );

    it('allow several teachers for the same subject name, in one class or in different classes', async () => {
      await inTransaction(async (client) => {
        const schoolId = await insertSchool(client);
        const firstTeacherId = await insertUser(client, schoolId, 'teacher');
        const secondTeacherId = await insertUser(client, schoolId, 'teacher');
        const classId = await insertClass(client, schoolId, '5-2');
        const otherClassId = await insertClass(client, schoolId, '6-1');

        await insertSubject(client, schoolId, classId, firstTeacherId, 'Matematika');

        await expect(
          insertSubject(client, schoolId, classId, secondTeacherId, 'Matematika'),
        ).resolves.toBeTruthy();
        await expect(
          insertSubject(client, schoolId, otherClassId, firstTeacherId, 'Matematika'),
        ).resolves.toBeTruthy();
      });
    });

    it('reject a teacher from another school', async () => {
      await inTransaction(async (client) => {
        const schoolId = await insertSchool(client, 'School A');
        const otherSchoolId = await insertSchool(client, 'School B');
        const teacherId = await insertUser(client, otherSchoolId, 'teacher');
        const classId = await insertClass(client, schoolId);

        await expect(insertSubject(client, schoolId, classId, teacherId)).rejects.toThrow(
          /violates foreign key constraint/,
        );
      });
    });

    it('reject a class from another school', async () => {
      await inTransaction(async (client) => {
        const schoolId = await insertSchool(client, 'School A');
        const otherSchoolId = await insertSchool(client, 'School B');
        const teacherId = await insertUser(client, schoolId, 'teacher');
        const classId = await insertClass(client, otherSchoolId);

        await expect(insertSubject(client, schoolId, classId, teacherId)).rejects.toThrow(
          /violates foreign key constraint/,
        );
      });
    });

    it('do not let a teacher change role while teaching a subject', async () => {
      await inTransaction(async (client) => {
        const schoolId = await insertSchool(client);
        const teacherId = await insertUser(client, schoolId, 'teacher');
        await insertSubject(client, schoolId, await insertClass(client, schoolId), teacherId);

        await expect(
          client.query(`UPDATE users SET role = 'parent' WHERE id = $1`, [teacherId]),
        ).rejects.toThrow(/violates foreign key constraint/);
      });
    });
  });
});

import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPool } from './pool.ts';
import {
  inRolledBackTransaction,
  insertParentStudent,
  insertSchool,
  insertUser,
} from './testUtils.ts';

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('parent_students', () => {
  // Created in beforeAll because describe bodies run even when the suite is skipped.
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  const inTransaction = (run: (client: pg.PoolClient) => Promise<void>) =>
    inRolledBackTransaction(pool, run);

  const foreignKeyViolation = /violates foreign key constraint/;

  it('links a parent to a child, added by an admin of the same school', async () => {
    await inTransaction(async (client) => {
      const schoolId = await insertSchool(client);
      const adminId = await insertUser(client, schoolId, 'admin');
      const parentId = await insertUser(client, schoolId, 'parent');
      const studentId = await insertUser(client, schoolId, 'student');

      await insertParentStudent(client, schoolId, parentId, studentId, adminId);

      const { rows } = await client.query(
        'SELECT 1 FROM parent_students WHERE parent_id = $1 AND student_id = $2',
        [parentId, studentId],
      );
      expect(rows).toHaveLength(1);
    });
  });

  it('allows a parent with several children and a child with several parents', async () => {
    await inTransaction(async (client) => {
      const schoolId = await insertSchool(client);
      const adminId = await insertUser(client, schoolId, 'admin');
      const mother = await insertUser(client, schoolId, 'parent');
      const father = await insertUser(client, schoolId, 'parent');
      const firstChild = await insertUser(client, schoolId, 'student');
      const secondChild = await insertUser(client, schoolId, 'student');

      await insertParentStudent(client, schoolId, mother, firstChild, adminId);
      await insertParentStudent(client, schoolId, mother, secondChild, adminId);
      await expect(
        insertParentStudent(client, schoolId, father, firstChild, adminId),
      ).resolves.toBeUndefined();
    });
  });

  it('rejects linking the same parent and child twice', async () => {
    await inTransaction(async (client) => {
      const schoolId = await insertSchool(client);
      const adminId = await insertUser(client, schoolId, 'admin');
      const parentId = await insertUser(client, schoolId, 'parent');
      const studentId = await insertUser(client, schoolId, 'student');
      await insertParentStudent(client, schoolId, parentId, studentId, adminId);

      await expect(
        insertParentStudent(client, schoolId, parentId, studentId, adminId),
      ).rejects.toThrow(/duplicate key value violates unique constraint/);
    });
  });

  it.each(['admin', 'teacher', 'student'] as const)(
    'rejects a user with the role "%s" on the parent side',
    async (role) => {
      await inTransaction(async (client) => {
        const schoolId = await insertSchool(client);
        const adminId = await insertUser(client, schoolId, 'admin');
        const notAParentId = await insertUser(client, schoolId, role);
        const studentId = await insertUser(client, schoolId, 'student');

        await expect(
          insertParentStudent(client, schoolId, notAParentId, studentId, adminId),
        ).rejects.toThrow(foreignKeyViolation);
      });
    },
  );

  it.each(['admin', 'teacher', 'parent'] as const)(
    'rejects a user with the role "%s" on the child side',
    async (role) => {
      await inTransaction(async (client) => {
        const schoolId = await insertSchool(client);
        const adminId = await insertUser(client, schoolId, 'admin');
        const parentId = await insertUser(client, schoolId, 'parent');
        const notAStudentId = await insertUser(client, schoolId, role);

        await expect(
          insertParentStudent(client, schoolId, parentId, notAStudentId, adminId),
        ).rejects.toThrow(foreignKeyViolation);
      });
    },
  );

  it.each(['teacher', 'parent', 'student'] as const)(
    'rejects a link created by a user with the role "%s"',
    async (role) => {
      await inTransaction(async (client) => {
        const schoolId = await insertSchool(client);
        const notAnAdminId = await insertUser(client, schoolId, role);
        const parentId = await insertUser(client, schoolId, 'parent');
        const studentId = await insertUser(client, schoolId, 'student');

        await expect(
          insertParentStudent(client, schoolId, parentId, studentId, notAnAdminId),
        ).rejects.toThrow(foreignKeyViolation);
      });
    },
  );

  it('rejects a parent from another school', async () => {
    await inTransaction(async (client) => {
      const schoolId = await insertSchool(client, 'School A');
      const otherSchoolId = await insertSchool(client, 'School B');
      const adminId = await insertUser(client, schoolId, 'admin');
      const parentId = await insertUser(client, otherSchoolId, 'parent');
      const studentId = await insertUser(client, schoolId, 'student');

      await expect(
        insertParentStudent(client, schoolId, parentId, studentId, adminId),
      ).rejects.toThrow(foreignKeyViolation);
    });
  });

  it('rejects a child from another school', async () => {
    await inTransaction(async (client) => {
      const schoolId = await insertSchool(client, 'School A');
      const otherSchoolId = await insertSchool(client, 'School B');
      const adminId = await insertUser(client, schoolId, 'admin');
      const parentId = await insertUser(client, schoolId, 'parent');
      const studentId = await insertUser(client, otherSchoolId, 'student');

      await expect(
        insertParentStudent(client, schoolId, parentId, studentId, adminId),
      ).rejects.toThrow(foreignKeyViolation);
    });
  });

  it('rejects an admin from another school', async () => {
    await inTransaction(async (client) => {
      const schoolId = await insertSchool(client, 'School A');
      const otherSchoolId = await insertSchool(client, 'School B');
      const otherAdminId = await insertUser(client, otherSchoolId, 'admin');
      const parentId = await insertUser(client, schoolId, 'parent');
      const studentId = await insertUser(client, schoolId, 'student');

      await expect(
        insertParentStudent(client, schoolId, parentId, studentId, otherAdminId),
      ).rejects.toThrow(foreignKeyViolation);
    });
  });

  it('does not let a linked parent change role', async () => {
    await inTransaction(async (client) => {
      const schoolId = await insertSchool(client);
      const adminId = await insertUser(client, schoolId, 'admin');
      const parentId = await insertUser(client, schoolId, 'parent');
      const studentId = await insertUser(client, schoolId, 'student');
      await insertParentStudent(client, schoolId, parentId, studentId, adminId);

      await expect(
        client.query(`UPDATE users SET role = 'teacher' WHERE id = $1`, [parentId]),
      ).rejects.toThrow(foreignKeyViolation);
    });
  });
});

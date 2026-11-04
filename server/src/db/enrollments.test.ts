import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPool } from './pool.ts';
import {
  inRolledBackTransaction,
  insertClass,
  insertEnrollment,
  insertParentStudent,
  insertSchool,
  insertSubject,
  insertUser,
} from './testUtils.ts';

// A small school: one subject, one student with a linked parent, and an unrelated parent.
async function createFixture(client: pg.PoolClient) {
  const schoolId = await insertSchool(client);
  const adminId = await insertUser(client, schoolId, 'admin');
  const teacherId = await insertUser(client, schoolId, 'teacher');
  const classId = await insertClass(client, schoolId);
  const subjectId = await insertSubject(client, schoolId, classId, teacherId);
  const studentId = await insertUser(client, schoolId, 'student');
  const parentId = await insertUser(client, schoolId, 'parent');
  const strangerParentId = await insertUser(client, schoolId, 'parent');
  await insertParentStudent(client, schoolId, parentId, studentId, adminId);

  return { schoolId, adminId, teacherId, subjectId, studentId, parentId, strangerParentId };
}

type Fixture = Awaited<ReturnType<typeof createFixture>>;

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('enrollments', () => {
  // Created in beforeAll because describe bodies run even when the suite is skipped.
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  const inTransaction = (run: (client: pg.PoolClient, f: Fixture) => Promise<void>) =>
    inRolledBackTransaction(pool, async (client) => run(client, await createFixture(client)));

  const foreignKeyViolation = /violates foreign key constraint/;
  const checkViolation = /violates check constraint/;

  describe('requests', () => {
    it('start as awaiting the parent when a student asks', async () => {
      await inTransaction(async (client, f) => {
        await insertEnrollment(client, {
          ...f,
          requestedBy: f.studentId,
          requestedByRole: 'student',
        });

        const { rows } = await client.query<{ status: string }>('SELECT status FROM enrollments');
        expect(rows).toEqual([{ status: 'awaiting_parent' }]);
      });
    });

    it('go straight to the teacher when a linked parent asks', async () => {
      await inTransaction(async (client, f) => {
        await expect(
          insertEnrollment(client, {
            ...f,
            requestedBy: f.parentId,
            requestedByRole: 'parent',
            status: 'awaiting_teacher',
            parentDecidedBy: f.parentId,
          }),
        ).resolves.toBeTruthy();
      });
    });

    it('reject a parent asking for a child they are not linked to', async () => {
      await inTransaction(async (client, f) => {
        await expect(
          insertEnrollment(client, {
            ...f,
            requestedBy: f.strangerParentId,
            requestedByRole: 'parent',
            status: 'awaiting_teacher',
            parentDecidedBy: f.strangerParentId,
          }),
        ).rejects.toThrow(foreignKeyViolation);
      });
    });

    it('reject a parent request that is not confirmed by that same parent', async () => {
      await inTransaction(async (client, f) => {
        await expect(
          insertEnrollment(client, { ...f, requestedBy: f.parentId, requestedByRole: 'parent' }),
        ).rejects.toThrow(checkViolation);
      });
    });

    it('reject a student asking on behalf of another student', async () => {
      await inTransaction(async (client, f) => {
        const otherStudentId = await insertUser(client, f.schoolId, 'student');

        await expect(
          insertEnrollment(client, {
            ...f,
            requestedBy: otherStudentId,
            requestedByRole: 'student',
          }),
        ).rejects.toThrow(checkViolation);
      });
    });

    it.each(['admin', 'teacher', 'parent'] as const)(
      'reject a user with the role "%s" as the enrolled student',
      async (role) => {
        await inTransaction(async (client, f) => {
          const notAStudentId = await insertUser(client, f.schoolId, role);

          await expect(
            insertEnrollment(client, {
              ...f,
              studentId: notAStudentId,
              requestedBy: notAStudentId,
              requestedByRole: 'student',
            }),
          ).rejects.toThrow(foreignKeyViolation);
        });
      },
    );

    it('reject a subject from another school', async () => {
      await inTransaction(async (client, f) => {
        const otherSchoolId = await insertSchool(client, 'School B');
        const otherTeacherId = await insertUser(client, otherSchoolId, 'teacher');
        const otherSubjectId = await insertSubject(
          client,
          otherSchoolId,
          await insertClass(client, otherSchoolId),
          otherTeacherId,
        );

        await expect(
          insertEnrollment(client, {
            ...f,
            subjectId: otherSubjectId,
            requestedBy: f.studentId,
            requestedByRole: 'student',
          }),
        ).rejects.toThrow(foreignKeyViolation);
      });
    });
  });

  describe('decisions', () => {
    const asStudent = (f: Fixture) => ({
      ...f,
      requestedBy: f.studentId,
      requestedByRole: 'student' as const,
    });

    it('allow the full path: student asks, parent confirms, teacher approves', async () => {
      await inTransaction(async (client, f) => {
        const id = await insertEnrollment(client, asStudent(f));

        await client.query(
          `UPDATE enrollments SET status = 'awaiting_teacher', parent_decided_by = $2,
             parent_decided_at = now() WHERE id = $1`,
          [id, f.parentId],
        );
        await client.query(
          `UPDATE enrollments SET status = 'approved', teacher_decided_by = $2,
             teacher_decided_at = now() WHERE id = $1`,
          [id, f.teacherId],
        );

        const { rows } = await client.query<{ status: string }>(
          'SELECT status FROM enrollments WHERE id = $1',
          [id],
        );
        expect(rows[0].status).toBe('approved');
      });
    });

    it('allow a parent to reject before the teacher sees the request', async () => {
      await inTransaction(async (client, f) => {
        await expect(
          insertEnrollment(client, {
            ...asStudent(f),
            status: 'rejected',
            parentDecidedBy: f.parentId,
          }),
        ).resolves.toBeTruthy();
      });
    });

    it('reject a confirmation from a parent who is not linked to the student', async () => {
      await inTransaction(async (client, f) => {
        const id = await insertEnrollment(client, asStudent(f));

        await expect(
          client.query(
            `UPDATE enrollments SET status = 'awaiting_teacher', parent_decided_by = $2,
               parent_decided_at = now() WHERE id = $1`,
            [id, f.strangerParentId],
          ),
        ).rejects.toThrow(foreignKeyViolation);
      });
    });

    it.each(['admin', 'student', 'parent'] as const)(
      'reject a teacher decision from a user with the role "%s"',
      async (role) => {
        await inTransaction(async (client, f) => {
          const notATeacherId = await insertUser(client, f.schoolId, role);

          await expect(
            insertEnrollment(client, {
              ...asStudent(f),
              status: 'approved',
              parentDecidedBy: f.parentId,
              teacherDecidedBy: notATeacherId,
            }),
          ).rejects.toThrow(foreignKeyViolation);
        });
      },
    );

    it('reject a teacher decision from another school', async () => {
      await inTransaction(async (client, f) => {
        const otherTeacherId = await insertUser(
          client,
          await insertSchool(client, 'School B'),
          'teacher',
        );

        await expect(
          insertEnrollment(client, {
            ...asStudent(f),
            status: 'approved',
            parentDecidedBy: f.parentId,
            teacherDecidedBy: otherTeacherId,
          }),
        ).rejects.toThrow(foreignKeyViolation);
      });
    });

    it.each([
      {
        name: 'awaiting_teacher without a parent decision',
        status: 'awaiting_teacher',
        withParent: false,
      },
      { name: 'approved without a teacher decision', status: 'approved', withParent: true },
      { name: 'rejected without any decision', status: 'rejected', withParent: false },
      {
        name: 'awaiting_parent with a parent decision',
        status: 'awaiting_parent',
        withParent: true,
      },
    ] as const)(
      'reject a status that does not match the decisions: $name',
      async ({ status, withParent }) => {
        await inTransaction(async (client, f) => {
          await expect(
            insertEnrollment(client, {
              ...asStudent(f),
              status,
              parentDecidedBy: withParent ? f.parentId : undefined,
            }),
          ).rejects.toThrow(checkViolation);
        });
      },
    );

    it('reject a decision without its time', async () => {
      await inTransaction(async (client, f) => {
        const id = await insertEnrollment(client, asStudent(f));

        await expect(
          client.query(
            `UPDATE enrollments SET status = 'awaiting_teacher', parent_decided_by = $2 WHERE id = $1`,
            [id, f.parentId],
          ),
        ).rejects.toThrow(checkViolation);
      });
    });
  });

  describe('repeated requests', () => {
    const asStudent = (f: Fixture) => ({
      ...f,
      requestedBy: f.studentId,
      requestedByRole: 'student' as const,
    });

    it('reject a second live request for the same subject', async () => {
      await inTransaction(async (client, f) => {
        await insertEnrollment(client, asStudent(f));

        await expect(insertEnrollment(client, asStudent(f))).rejects.toThrow(
          /duplicate key value violates unique constraint/,
        );
      });
    });

    it('reject a new request when the student is already approved', async () => {
      await inTransaction(async (client, f) => {
        await insertEnrollment(client, {
          ...asStudent(f),
          status: 'approved',
          parentDecidedBy: f.parentId,
          teacherDecidedBy: f.teacherId,
        });

        await expect(insertEnrollment(client, asStudent(f))).rejects.toThrow(
          /duplicate key value violates unique constraint/,
        );
      });
    });

    it('allow a new request after a rejection', async () => {
      await inTransaction(async (client, f) => {
        await insertEnrollment(client, {
          ...asStudent(f),
          status: 'rejected',
          parentDecidedBy: f.parentId,
        });

        await expect(insertEnrollment(client, asStudent(f))).resolves.toBeTruthy();
      });
    });
  });
});

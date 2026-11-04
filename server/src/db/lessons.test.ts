import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPool } from './pool.ts';
import {
  inRolledBackTransaction,
  insertClass,
  insertLesson,
  insertOption,
  insertQuestion,
  insertQuiz,
  insertSchool,
  insertSubject,
  insertSummary,
  insertUser,
} from './testUtils.ts';

const foreignKeyViolation = /violates foreign key constraint/;
const checkViolation = /violates check constraint/;
const uniqueViolation = /duplicate key value violates unique constraint/;

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('lessons, summaries and quizzes', () => {
  // Created in beforeAll because describe bodies run even when the suite is skipped.
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  // School A with a teacher and a subject; School B with its own teacher.
  async function createFixture(client: pg.PoolClient) {
    const schoolId = await insertSchool(client, 'School A');
    const teacherId = await insertUser(client, schoolId, 'teacher');
    const classId = await insertClass(client, schoolId);
    const subjectId = await insertSubject(client, schoolId, classId, teacherId);
    const otherSchoolId = await insertSchool(client, 'School B');
    const otherTeacherId = await insertUser(client, otherSchoolId, 'teacher');
    return { schoolId, teacherId, subjectId, otherSchoolId, otherTeacherId };
  }

  type Fixture = Awaited<ReturnType<typeof createFixture>>;

  // A failed statement aborts the whole transaction, so every attempt that is expected to
  // fail runs inside a savepoint that is undone afterwards.
  async function rejects(client: pg.PoolClient, run: () => Promise<unknown>, pattern: RegExp) {
    await client.query('SAVEPOINT attempt');
    await expect(run()).rejects.toThrow(pattern);
    await client.query('ROLLBACK TO SAVEPOINT attempt');
  }

  // Places in a quiz are checked only at the end of a transaction, so that questions can swap
  // places. A test that wants to see the check at once asks for that.
  const checkNow = (client: pg.PoolClient) => client.query('SET CONSTRAINTS ALL IMMEDIATE');

  const inTransaction = (run: (client: pg.PoolClient, f: Fixture) => Promise<void>) =>
    inRolledBackTransaction(pool, async (client) => run(client, await createFixture(client)));

  const lessonOf = (f: Fixture) => ({
    schoolId: f.schoolId,
    subjectId: f.subjectId,
    createdBy: f.teacherId,
  });

  describe('lessons', () => {
    it('start as drafts, with the first revision of the text', async () => {
      await inTransaction(async (client, f) => {
        const id = await insertLesson(client, lessonOf(f));

        const { rows } = await client.query(
          'SELECT status, body_revision, source, processing_error, published_at FROM lessons WHERE id = $1',
          [id],
        );
        expect(rows[0]).toEqual({
          status: 'draft',
          body_revision: 1,
          source: 'pasted',
          processing_error: null,
          published_at: null,
        });
      });
    });

    it.each(['admin', 'student', 'parent'] as const)(
      'cannot be created by a user with the role "%s"',
      async (role) => {
        await inTransaction(async (client, f) => {
          const notATeacher = await insertUser(client, f.schoolId, role);

          await expect(
            insertLesson(client, { ...lessonOf(f), createdBy: notATeacher }),
          ).rejects.toThrow(foreignKeyViolation);
        });
      },
    );

    it('cannot be created by a teacher of another school', async () => {
      await inTransaction(async (client, f) => {
        await expect(
          insertLesson(client, { ...lessonOf(f), createdBy: f.otherTeacherId }),
        ).rejects.toThrow(foreignKeyViolation);
      });
    });

    it('cannot belong to a subject of another school', async () => {
      await inTransaction(async (client, f) => {
        const otherClass = await insertClass(client, f.otherSchoolId);
        const otherSubject = await insertSubject(
          client,
          f.otherSchoolId,
          otherClass,
          f.otherTeacherId,
        );

        await expect(
          insertLesson(client, { ...lessonOf(f), subjectId: otherSubject }),
        ).rejects.toThrow(foreignKeyViolation);
      });
    });

    it.each(['', '   ', 'x'.repeat(201)])('reject the title "%s"', async (title) => {
      await inTransaction(async (client, f) => {
        await expect(insertLesson(client, { ...lessonOf(f), title })).rejects.toThrow(
          checkViolation,
        );
      });
    });

    it('accept a title of 200 characters and a long text', async () => {
      await inTransaction(async (client, f) => {
        await expect(
          insertLesson(client, {
            ...lessonOf(f),
            title: 'x'.repeat(200),
            body: 'a'.repeat(100000),
          }),
        ).resolves.toBeTruthy();
      });
    });

    it('reject a text above the safety limit', async () => {
      await inTransaction(async (client, f) => {
        await expect(
          insertLesson(client, { ...lessonOf(f), body: 'a'.repeat(100001) }),
        ).rejects.toThrow(checkViolation);
      });
    });

    it('need a time of publishing once they are published', async () => {
      await inTransaction(async (client, f) => {
        await rejects(
          client,
          () => insertLesson(client, { ...lessonOf(f), status: 'published' }),
          checkViolation,
        );
        await expect(
          insertLesson(client, {
            ...lessonOf(f),
            status: 'published',
            publishedAt: new Date().toISOString(),
          }),
        ).resolves.toBeTruthy();
      });
    });

    it('reject a revision below 1 and a file name that is too long', async () => {
      await inTransaction(async (client, f) => {
        const id = await insertLesson(client, lessonOf(f));

        await expect(
          client.query('UPDATE lessons SET body_revision = 0 WHERE id = $1', [id]),
        ).rejects.toThrow(checkViolation);
      });
      await inTransaction(async (client, f) => {
        const id = await insertLesson(client, lessonOf(f));

        await expect(
          client.query('UPDATE lessons SET source_file_name = $2 WHERE id = $1', [
            id,
            'x'.repeat(256),
          ]),
        ).rejects.toThrow(checkViolation);
      });
    });

    it('keep their subject from being deleted', async () => {
      await inTransaction(async (client, f) => {
        await insertLesson(client, lessonOf(f));

        await expect(
          client.query('DELETE FROM subjects WHERE id = $1', [f.subjectId]),
        ).rejects.toThrow(foreignKeyViolation);
      });
    });
  });

  describe('summaries', () => {
    it('are one per lesson', async () => {
      await inTransaction(async (client, f) => {
        const lessonId = await insertLesson(client, lessonOf(f));
        await insertSummary(client, { schoolId: f.schoolId, lessonId });

        await expect(insertSummary(client, { schoolId: f.schoolId, lessonId })).rejects.toThrow(
          uniqueViolation,
        );
      });
    });

    it('must belong to the school of their lesson', async () => {
      await inTransaction(async (client, f) => {
        const lessonId = await insertLesson(client, lessonOf(f));

        await expect(
          insertSummary(client, { schoolId: f.otherSchoolId, lessonId }),
        ).rejects.toThrow(foreignKeyViolation);
      });
    });

    it.each([
      ['no points', [] as string[]],
      ['more than 30 points', Array.from({ length: 31 }, (_, index) => `Tačka ${index}`)],
    ])('reject %s', async (_name, points) => {
      await inTransaction(async (client, f) => {
        const lessonId = await insertLesson(client, lessonOf(f));

        await expect(
          insertSummary(client, { schoolId: f.schoolId, lessonId, points }),
        ).rejects.toThrow(checkViolation);
      });
    });

    it('accept between 1 and 30 points', async () => {
      await inTransaction(async (client, f) => {
        const one = await insertLesson(client, lessonOf(f));
        const many = await insertLesson(client, lessonOf(f));

        await expect(
          insertSummary(client, { schoolId: f.schoolId, lessonId: one, points: ['Jedna'] }),
        ).resolves.toBeUndefined();
        await expect(
          insertSummary(client, {
            schoolId: f.schoolId,
            lessonId: many,
            points: Array.from({ length: 30 }, (_, index) => `Tačka ${index}`),
          }),
        ).resolves.toBeUndefined();
      });
    });

    it('can be approved by a teacher of the school, with the time', async () => {
      await inTransaction(async (client, f) => {
        const lessonId = await insertLesson(client, lessonOf(f));

        await expect(
          insertSummary(client, {
            schoolId: f.schoolId,
            lessonId,
            status: 'approved',
            approvedBy: f.teacherId,
            approvedAt: new Date().toISOString(),
          }),
        ).resolves.toBeUndefined();
      });
    });

    it('are approved only together with who approved and when', async () => {
      await inTransaction(async (client, f) => {
        const lessonId = await insertLesson(client, lessonOf(f));

        await expect(
          insertSummary(client, { schoolId: f.schoolId, lessonId, status: 'approved' }),
        ).rejects.toThrow(checkViolation);
      });
    });

    it('cannot be a draft that already has an approval', async () => {
      await inTransaction(async (client, f) => {
        const lessonId = await insertLesson(client, lessonOf(f));

        await expect(
          insertSummary(client, {
            schoolId: f.schoolId,
            lessonId,
            status: 'draft',
            approvedBy: f.teacherId,
            approvedAt: new Date().toISOString(),
          }),
        ).rejects.toThrow(checkViolation);
      });
    });

    it.each(['admin', 'student', 'parent'] as const)(
      'cannot be approved by a user with the role "%s"',
      async (role) => {
        await inTransaction(async (client, f) => {
          const lessonId = await insertLesson(client, lessonOf(f));
          const notATeacher = await insertUser(client, f.schoolId, role);

          await expect(
            insertSummary(client, {
              schoolId: f.schoolId,
              lessonId,
              status: 'approved',
              approvedBy: notATeacher,
              approvedAt: new Date().toISOString(),
            }),
          ).rejects.toThrow(foreignKeyViolation);
        });
      },
    );

    it('cannot be approved by a teacher of another school', async () => {
      await inTransaction(async (client, f) => {
        const lessonId = await insertLesson(client, lessonOf(f));

        await expect(
          insertSummary(client, {
            schoolId: f.schoolId,
            lessonId,
            status: 'approved',
            approvedBy: f.otherTeacherId,
            approvedAt: new Date().toISOString(),
          }),
        ).rejects.toThrow(foreignKeyViolation);
      });
    });

    it('are deleted together with their lesson', async () => {
      await inTransaction(async (client, f) => {
        const lessonId = await insertLesson(client, lessonOf(f));
        await insertSummary(client, { schoolId: f.schoolId, lessonId });

        await client.query('DELETE FROM lessons WHERE id = $1', [lessonId]);

        const { rows } = await client.query('SELECT 1 FROM lesson_summaries');
        expect(rows).toHaveLength(0);
      });
    });
  });

  describe('quizzes', () => {
    it('are one per lesson, and follow the same approval rules as summaries', async () => {
      await inTransaction(async (client, f) => {
        const lessonId = await insertLesson(client, lessonOf(f));
        await insertQuiz(client, { schoolId: f.schoolId, lessonId });

        await expect(insertQuiz(client, { schoolId: f.schoolId, lessonId })).rejects.toThrow(
          uniqueViolation,
        );
      });
    });

    it('are approved only by a teacher of the school, together with the time', async () => {
      await inTransaction(async (client, f) => {
        const first = await insertLesson(client, lessonOf(f));
        const second = await insertLesson(client, lessonOf(f));
        const student = await insertUser(client, f.schoolId, 'student');

        await rejects(
          client,
          () => insertQuiz(client, { schoolId: f.schoolId, lessonId: first, status: 'approved' }),
          checkViolation,
        );
        await rejects(
          client,
          () =>
            insertQuiz(client, {
              schoolId: f.schoolId,
              lessonId: second,
              status: 'approved',
              approvedBy: student,
              approvedAt: new Date().toISOString(),
            }),
          foreignKeyViolation,
        );
      });
    });

    it('are deleted with their lesson, together with their questions and answers', async () => {
      await inTransaction(async (client, f) => {
        const lessonId = await insertLesson(client, lessonOf(f));
        await insertQuiz(client, { schoolId: f.schoolId, lessonId });
        const questionId = await insertQuestion(client, { lessonId });
        await insertOption(client, { questionId, isCorrect: true });

        await client.query('DELETE FROM lessons WHERE id = $1', [lessonId]);

        for (const table of ['lesson_quizzes', 'quiz_questions', 'quiz_options']) {
          const { rows } = await client.query(`SELECT 1 FROM ${table}`);
          expect(rows).toHaveLength(0);
        }
      });
    });
  });

  describe('questions', () => {
    async function withQuiz(client: pg.PoolClient, f: Fixture) {
      const lessonId = await insertLesson(client, lessonOf(f));
      await insertQuiz(client, { schoolId: f.schoolId, lessonId });
      return lessonId;
    }

    it('need a quiz', async () => {
      await inTransaction(async (client, f) => {
        const lessonWithoutQuiz = await insertLesson(client, lessonOf(f));

        await expect(insertQuestion(client, { lessonId: lessonWithoutQuiz })).rejects.toThrow(
          foreignKeyViolation,
        );
      });
    });

    it('have their own place in the quiz', async () => {
      await inTransaction(async (client, f) => {
        const lessonId = await withQuiz(client, f);
        await insertQuestion(client, { lessonId, position: 1 });
        await checkNow(client);

        await rejects(
          client,
          () => insertQuestion(client, { lessonId, position: 1 }),
          uniqueViolation,
        );
        await expect(insertQuestion(client, { lessonId, position: 2 })).resolves.toBeTruthy();
      });
    });

    it('can swap places in a single change', async () => {
      await inTransaction(async (client, f) => {
        const lessonId = await withQuiz(client, f);
        const first = await insertQuestion(client, { lessonId, position: 1, prompt: 'Prvo' });
        const second = await insertQuestion(client, { lessonId, position: 2, prompt: 'Drugo' });

        await client.query(
          `UPDATE quiz_questions SET position = CASE id WHEN $1 THEN 2 ELSE 1 END
           WHERE id IN ($1, $2)`,
          [first, second],
        );

        const { rows } = await client.query<{ prompt: string }>(
          'SELECT prompt FROM quiz_questions WHERE lesson_id = $1 ORDER BY position',
          [lessonId],
        );
        expect(rows.map((row) => row.prompt)).toEqual(['Drugo', 'Prvo']);
      });
    });

    it('reject a place below 1, a blank or too long question, and an unknown kind', async () => {
      await inTransaction(async (client, f) => {
        const lessonId = await withQuiz(client, f);

        await rejects(
          client,
          () => insertQuestion(client, { lessonId, position: 0 }),
          checkViolation,
        );
        await rejects(
          client,
          () => insertQuestion(client, { lessonId, prompt: '   ' }),
          checkViolation,
        );
        await rejects(
          client,
          () => insertQuestion(client, { lessonId, prompt: 'x'.repeat(501) }),
          checkViolation,
        );
        await rejects(
          client,
          () =>
            client.query(
              `INSERT INTO quiz_questions (lesson_id, position, kind, prompt)
               VALUES ($1, 1, 'essay', 'Pitanje')`,
              [lessonId],
            ),
          /invalid input value for enum quiz_question_kind/,
        );
      });
    });

    it('accept a true/false kind and an explanation of up to 500 characters', async () => {
      await inTransaction(async (client, f) => {
        const lessonId = await withQuiz(client, f);
        const id = await insertQuestion(client, { lessonId, kind: 'true_false' });

        await client.query('UPDATE quiz_questions SET explanation = $2 WHERE id = $1', [
          id,
          'x'.repeat(500),
        ]);
        await expect(
          client.query('UPDATE quiz_questions SET explanation = $2 WHERE id = $1', [
            id,
            'x'.repeat(501),
          ]),
        ).rejects.toThrow(checkViolation);
      });
    });
  });

  describe('answer options', () => {
    async function withQuestion(client: pg.PoolClient, f: Fixture) {
      const lessonId = await insertLesson(client, lessonOf(f));
      await insertQuiz(client, { schoolId: f.schoolId, lessonId });
      return insertQuestion(client, { lessonId });
    }

    it('may include several wrong answers and only one right answer', async () => {
      await inTransaction(async (client, f) => {
        const questionId = await withQuestion(client, f);
        await insertOption(client, { questionId, position: 1, isCorrect: true });
        await insertOption(client, { questionId, position: 2 });
        await insertOption(client, { questionId, position: 3 });

        await expect(
          insertOption(client, { questionId, position: 4, isCorrect: true }),
        ).rejects.toThrow(uniqueViolation);
      });
    });

    it('allow a right answer in each question', async () => {
      await inTransaction(async (client, f) => {
        const first = await withQuestion(client, f);
        const second = await withQuestion(client, f);

        await insertOption(client, { questionId: first, isCorrect: true });
        await expect(
          insertOption(client, { questionId: second, isCorrect: true }),
        ).resolves.toBeTruthy();
      });
    });

    it('have their own place and a text', async () => {
      await inTransaction(async (client, f) => {
        const questionId = await withQuestion(client, f);
        await insertOption(client, { questionId, position: 1 });
        await checkNow(client);

        await rejects(
          client,
          () => insertOption(client, { questionId, position: 1 }),
          uniqueViolation,
        );
        await rejects(
          client,
          () => insertOption(client, { questionId, position: 0 }),
          checkViolation,
        );
        await rejects(
          client,
          () => insertOption(client, { questionId, position: 2, text: '  ' }),
          checkViolation,
        );
        await rejects(
          client,
          () => insertOption(client, { questionId, position: 3, text: 'x'.repeat(301) }),
          checkViolation,
        );
      });
    });

    it('need a question, and go away with it', async () => {
      await inTransaction(async (client, f) => {
        await rejects(
          client,
          () => insertOption(client, { questionId: '00000000-0000-0000-0000-000000000000' }),
          foreignKeyViolation,
        );

        const questionId = await withQuestion(client, f);
        await insertOption(client, { questionId });
        await client.query('DELETE FROM quiz_questions WHERE id = $1', [questionId]);

        const { rows } = await client.query('SELECT 1 FROM quiz_options');
        expect(rows).toHaveLength(0);
      });
    });
  });
});

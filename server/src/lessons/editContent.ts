import type { QuizContent, SummaryContent } from '../ai/types.ts';
import type { AuthUser } from '../auth/sessions.ts';
import type { Queryable } from '../db/pool.ts';
import { inTransaction } from '../db/transaction.ts';
import { HttpError } from '../http/errors.ts';
import { writeQuiz, writeSummary } from './contentWrite.ts';
import { getLesson, type Lesson, type LessonStatus } from './lessons.ts';

export type ContentPart = 'summary' | 'quiz';

const TABLE: Record<ContentPart, string> = {
  summary: 'lesson_summaries',
  quiz: 'lesson_quizzes',
};

const missing = (part: ContentPart) =>
  new HttpError(404, 'not_found', `This lesson has no ${part} yet.`);

// Locks the lesson of the teacher for the changes that follow, so nothing else (the AI
// finishing, a publish) slips in between the check and the write. Only the teacher of the
// subject gets a lesson; everybody else sees a 404. A lesson that students read, or that the
// AI is working on, cannot be changed.
async function lockLesson(
  db: Queryable,
  { user, lessonId }: { user: AuthUser; lessonId: string },
): Promise<{ revision: number }> {
  const { rows } = await db.query<{ status: LessonStatus; revision: number }>(
    `SELECT l.status, l.body_revision AS revision
     FROM lessons l JOIN subjects s ON s.id = l.subject_id
     WHERE l.id = $1 AND l.school_id = $2 AND s.teacher_id = $3
     FOR UPDATE OF l`,
    [lessonId, user.schoolId, user.id],
  );
  if (!rows[0]) {
    throw new HttpError(404, 'not_found', 'Lesson not found.');
  }
  if (rows[0].status === 'published') {
    throw new HttpError(
      409,
      'lesson_published',
      'Take the lesson back to a draft before changing it.',
    );
  }
  if (rows[0].status === 'processing') {
    throw new HttpError(
      409,
      'lesson_busy',
      'The lesson is being processed. Try again in a moment.',
    );
  }
  return { revision: rows[0].revision };
}

// Writes the summary, or replaces the one that is there (also the one the AI made). It becomes a
// draft again, and a teacher must approve it after every change.
export async function saveSummary(
  pool: Queryable,
  { user, lessonId, content }: { user: AuthUser; lessonId: string; content: SummaryContent },
): Promise<Lesson> {
  await inTransaction(pool, async (db) => {
    const { revision } = await lockLesson(db, { user, lessonId });
    await writeSummary(db, {
      schoolId: user.schoolId,
      lessonId,
      revision,
      content,
      origin: 'teacher',
      keepOrigin: true,
    });
  });
  return getLesson(pool, { user, lessonId });
}

// Writes the whole quiz, or replaces the one that is there. The questions are replaced, so
// they get new ids.
export async function saveQuiz(
  pool: Queryable,
  { user, lessonId, content }: { user: AuthUser; lessonId: string; content: QuizContent },
): Promise<Lesson> {
  await inTransaction(pool, async (db) => {
    const { revision } = await lockLesson(db, { user, lessonId });
    await writeQuiz(db, {
      schoolId: user.schoolId,
      lessonId,
      revision,
      content,
      origin: 'teacher',
      keepOrigin: true,
    });
  });
  return getLesson(pool, { user, lessonId });
}

export async function deleteContent(
  pool: Queryable,
  { user, lessonId, part }: { user: AuthUser; lessonId: string; part: ContentPart },
): Promise<Lesson> {
  await inTransaction(pool, async (db) => {
    await lockLesson(db, { user, lessonId });
    const { rowCount } = await db.query(`DELETE FROM ${TABLE[part]} WHERE lesson_id = $1`, [
      lessonId,
    ]);
    if (!rowCount) {
      throw missing(part);
    }
  });
  return getLesson(pool, { user, lessonId });
}

// The teacher confirms that the summary (or the quiz) is right. This is the only way it can be
// seen by students. If the text changed after it was made, approving it also confirms that it
// still fits the new text.
export async function approveContent(
  pool: Queryable,
  { user, lessonId, part }: { user: AuthUser; lessonId: string; part: ContentPart },
): Promise<Lesson> {
  await inTransaction(pool, async (db) => {
    const { revision } = await lockLesson(db, { user, lessonId });
    const { rowCount } = await db.query(
      `UPDATE ${TABLE[part]} SET status = 'approved', approved_by = $2, approved_at = now(),
         based_on_revision = $3, updated_at = now()
       WHERE lesson_id = $1`,
      [lessonId, user.id, revision],
    );
    if (!rowCount) {
      throw missing(part);
    }
  });
  return getLesson(pool, { user, lessonId });
}

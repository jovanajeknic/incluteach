import type { AuthUser } from '../auth/sessions.ts';
import type { Queryable } from '../db/pool.ts';
import { HttpError } from '../http/errors.ts';
import { getLesson } from '../lessons/lessons.ts';
import { lessonProgress, passedAttemptId, type LessonProgress } from './progress.ts';

// The student presses "Završi lekciju". A lesson without a quiz can be finished at any time.
// A lesson with a quiz can be finished only after a try with every answer right (for the quiz
// as it is now), so the button is never a way around the quiz. Pressing it again changes
// nothing.
export async function completeLesson(
  pool: Queryable,
  { user, lessonId }: { user: AuthUser; lessonId: string },
): Promise<LessonProgress> {
  // A lesson the student cannot see is a 404, like everywhere else.
  const lesson = await getLesson(pool, { user, lessonId });

  const before = await lessonProgress(pool, { studentId: user.id, lessonId, quiz: lesson.quiz });
  if (before.completed) {
    return before;
  }

  const attemptId = lesson.quiz
    ? await passedAttemptId(pool, { studentId: user.id, lessonId, quiz: lesson.quiz })
    : null;
  if (lesson.quiz && !attemptId) {
    throw new HttpError(
      409,
      'quiz_not_passed',
      'The lesson can be finished after a try of the quiz in which every answer is right.',
    );
  }

  await pool.query(
    `INSERT INTO lesson_completions (lesson_id, school_id, student_id, attempt_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (lesson_id, student_id) DO NOTHING`,
    [lessonId, user.schoolId, user.id, attemptId],
  );
  return lessonProgress(pool, { studentId: user.id, lessonId, quiz: lesson.quiz });
}

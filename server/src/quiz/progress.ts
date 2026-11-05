import type { Queryable } from '../db/pool.ts';
import type { QuizView } from '../lessons/content.ts';

// After a try, the child waits this long before the next one. The wait is for learning: a
// child who must wait reads the mistakes again and thinks, instead of clicking through the
// same questions at once until the answers happen to be right.
export const RETRY_AFTER_MINUTES = 10;

// The order in which a try shows its questions, and the answers of each question.
export interface AttemptOrder {
  questions: string[];
  options: Record<string, string[]>;
}

// Whether the questions and answers a try was made for are all still in the quiz. If a
// teacher rewrote the quiz in the meantime they are not.
export function matchesQuiz(order: AttemptOrder, quiz: QuizView): boolean {
  const questions = new Map(quiz.questions.map((question) => [question.id, question]));
  return (
    order.questions.length === quiz.questions.length &&
    order.questions.every((questionId) => {
      const question = questions.get(questionId);
      const optionIds = new Set(question?.options.map((option) => option.id));
      return (
        question !== undefined &&
        order.options[questionId]?.length === optionIds.size &&
        order.options[questionId].every((optionId) => optionIds.has(optionId))
      );
    })
  );
}

// When the child may start the next try, or null if there is no wait. The wait counts from
// the last answer of a try that has ended, also one that was left unfinished; a try in which
// nothing was answered causes no wait.
export async function nextAttemptAt(
  db: Queryable,
  { studentId, lessonId }: { studentId: string; lessonId: string },
): Promise<Date | null> {
  const { rows } = await db.query<{ next_at: Date | null; must_wait: boolean }>(
    `SELECT next_at, coalesce(next_at > now(), false) AS must_wait FROM (
       SELECT max(a.last_activity_at) + make_interval(mins => $3) AS next_at
       FROM quiz_attempts a
       WHERE a.student_id = $1 AND a.lesson_id = $2 AND a.status <> 'in_progress'
         AND EXISTS (SELECT 1 FROM quiz_answers w WHERE w.attempt_id = a.id)
     ) last_attempt`,
    [studentId, lessonId, RETRY_AFTER_MINUTES],
  );
  return rows[0].must_wait ? rows[0].next_at : null;
}

// Whether the child has a completed try with every answer right for the quiz as it is now.
// Returns the id of the latest such try.
export async function passedAttemptId(
  db: Queryable,
  { studentId, lessonId, quiz }: { studentId: string; lessonId: string; quiz: QuizView },
): Promise<string | null> {
  const { rows } = await db.query<{ id: string; order_data: AttemptOrder }>(
    `SELECT id, order_data FROM quiz_attempts
     WHERE student_id = $1 AND lesson_id = $2 AND status = 'completed' AND all_correct
     ORDER BY completed_at DESC`,
    [studentId, lessonId],
  );
  return rows.find((row) => matchesQuiz(row.order_data, quiz))?.id ?? null;
}

// Where a child stands in a lesson.
export interface LessonProgress {
  // The lesson was officially finished with the "Završi lekciju" button.
  completed: boolean;
  completedAt: string | null;
  // The button may be pressed now: the lesson has no quiz, or the quiz was passed.
  canFinish: boolean;
  // Null if the lesson has no quiz the child can do.
  quiz: {
    // A try the child can go on with.
    openAttemptId: string | null;
    // When a new try may start; null if it may start now.
    nextAttemptAt: string | null;
    // A try with every answer right exists for the quiz as it is now.
    passed: boolean;
  } | null;
}

export async function lessonProgress(
  db: Queryable,
  { studentId, lessonId, quiz }: { studentId: string; lessonId: string; quiz: QuizView | null },
): Promise<LessonProgress> {
  const { rows: done } = await db.query<{ completed_at: Date }>(
    'SELECT completed_at FROM lesson_completions WHERE lesson_id = $1 AND student_id = $2',
    [lessonId, studentId],
  );
  const completedAt = done[0]?.completed_at.toISOString() ?? null;

  if (!quiz) {
    return {
      completed: completedAt !== null,
      completedAt,
      canFinish: completedAt === null,
      quiz: null,
    };
  }

  const { rows: open } = await db.query<{ id: string }>(
    `SELECT id FROM quiz_attempts
     WHERE student_id = $1 AND lesson_id = $2 AND status = 'in_progress'`,
    [studentId, lessonId],
  );
  const passed = (await passedAttemptId(db, { studentId, lessonId, quiz })) !== null;
  const wait = await nextAttemptAt(db, { studentId, lessonId });
  return {
    completed: completedAt !== null,
    completedAt,
    canFinish: completedAt === null && passed,
    quiz: {
      openAttemptId: open[0]?.id ?? null,
      nextAttemptAt: wait?.toISOString() ?? null,
      passed,
    },
  };
}

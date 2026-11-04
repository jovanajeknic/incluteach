import { randomInt } from 'node:crypto';

import type { AuthUser } from '../auth/sessions.ts';
import type { Queryable } from '../db/pool.ts';
import { inTransaction } from '../db/transaction.ts';
import { HttpError } from '../http/errors.ts';
import { getLesson } from '../lessons/lessons.ts';

// After an attempt, the child waits this long before starting the next one. The wait is for
// learning: a child who must wait reads the mistakes again and thinks, instead of clicking
// through the same questions at once until the answers happen to be right.
export const RETRY_AFTER_MINUTES = 10;

// An attempt left open for longer than this is closed. The child starts a new one.
const OPEN_ATTEMPT_MAX_AGE_MINUTES = 120;

// The order in which an attempt shows its questions, and the answers of each question.
interface AttemptOrder {
  questions: string[];
  options: Record<string, string[]>;
}

export interface AnswerFeedback {
  optionId: string | null;
  correct: boolean;
  correctOptionId: string | null;
  explanation: string | null;
}

export interface AttemptQuestion {
  id: string;
  position: number;
  kind: 'choice' | 'true_false';
  prompt: string;
  options: { id: string; text: string }[];
  // Filled in once the child has answered; the right answer is never sent before that.
  answer: AnswerFeedback | null;
}

export interface Attempt {
  id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt: string;
  completedAt: string | null;
  // Whether every answer was right. Null until the attempt is completed.
  allCorrect: boolean | null;
  questions: AttemptQuestion[];
}

interface AttemptRow {
  id: string;
  status: Attempt['status'];
  order_data: AttemptOrder;
  question_count: number;
  started_at: Date;
  last_activity_at: Date;
  completed_at: Date | null;
  all_correct: boolean | null;
}

// A random order. Every call gives a different one, so two attempts rarely look the same.
function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = randomInt(index + 1);
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

const notFound = () => new HttpError(404, 'not_found', 'Quiz not found.');

// The quiz of a lesson as the student sees it, or a 404. A student only gets a lesson that is
// published, of a subject they joined, and a quiz that a teacher approved and that still fits
// the text.
async function studentQuiz(pool: Queryable, user: AuthUser, lessonId: string) {
  if (user.role !== 'student') {
    throw notFound();
  }
  const lesson = await getLesson(pool, { user, lessonId });
  if (!lesson.quiz) {
    throw notFound();
  }
  return lesson.quiz;
}

type StudentQuiz = Awaited<ReturnType<typeof studentQuiz>>;

// Whether the questions and answers an attempt was made for are all still in the quiz. If a
// teacher rewrote the quiz in the meantime they are not.
function matchesQuiz(order: AttemptOrder, quiz: StudentQuiz): boolean {
  const questions = new Map(quiz.questions.map((question) => [question.id, question]));
  return order.questions.every((questionId) => {
    const question = questions.get(questionId);
    const optionIds = new Set(question?.options.map((option) => option.id));
    return (
      question !== undefined &&
      order.options[questionId]?.length === optionIds.size &&
      order.options[questionId].every((optionId) => optionIds.has(optionId))
    );
  });
}

async function buildAttempt(db: Queryable, row: AttemptRow, quiz: StudentQuiz): Promise<Attempt> {
  const questions = new Map(quiz.questions.map((question) => [question.id, question]));

  const { rows: answers } = await db.query<{
    question_id: string;
    option_id: string | null;
    is_correct: boolean;
    explanation: string | null;
  }>(
    'SELECT question_id, option_id, is_correct, explanation FROM quiz_answers WHERE attempt_id = $1',
    [row.id],
  );
  const { rows: rightOptions } = await db.query<{ question_id: string; id: string }>(
    `SELECT o.question_id, o.id FROM quiz_options o
     JOIN quiz_questions q ON q.id = o.question_id
     WHERE q.id = ANY($1::uuid[]) AND o.is_correct`,
    [row.order_data.questions],
  );
  const right = new Map(rightOptions.map((option) => [option.question_id, option.id]));
  const answered = new Map(answers.map((answer) => [answer.question_id, answer]));

  return {
    id: row.id,
    status: row.status,
    startedAt: row.started_at.toISOString(),
    completedAt: row.completed_at?.toISOString() ?? null,
    allCorrect: row.all_correct,
    questions: row.order_data.questions.map((questionId, index) => {
      const question = questions.get(questionId);
      const answer = answered.get(questionId);
      const options = new Map(question?.options.map((option) => [option.id, option]));
      return {
        id: questionId,
        position: index + 1,
        kind: question?.kind ?? 'choice',
        prompt: question?.prompt ?? '',
        options: (row.order_data.options[questionId] ?? []).flatMap((optionId) => {
          const option = options.get(optionId);
          return option ? [{ id: option.id, text: option.text }] : [];
        }),
        answer: answer
          ? {
              optionId: answer.option_id,
              correct: answer.is_correct,
              correctOptionId: right.get(questionId) ?? null,
              explanation: answer.explanation,
            }
          : null,
      };
    }),
  };
}

// A child starts the quiz. If an attempt is still open it is continued; otherwise a new one
// starts, with the questions and answers in a new random order (a true/false question keeps
// "Tačno" before "Netačno"). A new attempt is only possible 10 minutes after the last one in
// which the child answered anything.
export async function startAttempt(
  pool: Queryable,
  { user, lessonId }: { user: AuthUser; lessonId: string },
): Promise<{ attempt: Attempt; resumed: boolean }> {
  const quiz = await studentQuiz(pool, user, lessonId);

  return inTransaction(pool, async (db) => {
    // One request at a time per child and lesson, so two clicks cannot start two attempts.
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
      `${user.id}:${lessonId}`,
    ]);

    const { rows: open } = await db.query<AttemptRow & { too_old: boolean }>(
      `SELECT *, last_activity_at < now() - make_interval(mins => $3) AS too_old
       FROM quiz_attempts
       WHERE student_id = $1 AND lesson_id = $2 AND status = 'in_progress'`,
      [user.id, lessonId, OPEN_ATTEMPT_MAX_AGE_MINUTES],
    );
    if (open[0]) {
      if (!open[0].too_old && matchesQuiz(open[0].order_data, quiz)) {
        return { attempt: await buildAttempt(db, open[0], quiz), resumed: true };
      }
      // Left open too long, or the quiz was rewritten since: it cannot go on.
      await db.query("UPDATE quiz_attempts SET status = 'abandoned' WHERE id = $1", [open[0].id]);
    }

    const { rows: waiting } = await db.query<{ next_at: Date | null; must_wait: boolean }>(
      `SELECT next_at, coalesce(next_at > now(), false) AS must_wait FROM (
         SELECT max(a.last_activity_at) + make_interval(mins => $3) AS next_at
         FROM quiz_attempts a
         WHERE a.student_id = $1 AND a.lesson_id = $2 AND a.status <> 'in_progress'
           AND EXISTS (SELECT 1 FROM quiz_answers w WHERE w.attempt_id = a.id)
       ) last_attempt`,
      [user.id, lessonId, RETRY_AFTER_MINUTES],
    );
    if (waiting[0].must_wait && waiting[0].next_at) {
      throw new HttpError(
        409,
        'retry_later',
        `The quiz can be done again in ${RETRY_AFTER_MINUTES} minutes after the last try. Use the time to read the lesson again.`,
        { nextAttemptAt: waiting[0].next_at.toISOString() },
      );
    }

    const order: AttemptOrder = {
      questions: shuffled(quiz.questions.map((question) => question.id)),
      options: Object.fromEntries(
        quiz.questions.map((question) => {
          const inOrder = [...question.options].sort((a, b) => a.position - b.position);
          const shown = question.kind === 'true_false' ? inOrder : shuffled(inOrder);
          return [question.id, shown.map((option) => option.id)];
        }),
      ),
    };
    const { rows } = await db.query<AttemptRow>(
      `INSERT INTO quiz_attempts (school_id, lesson_id, student_id, order_data, question_count)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user.schoolId, lessonId, user.id, JSON.stringify(order), order.questions.length],
    );
    return { attempt: await buildAttempt(db, rows[0], quiz), resumed: false };
  });
}

export interface AnswerResult {
  answer: AnswerFeedback & { questionId: string };
  attempt: {
    id: string;
    status: Attempt['status'];
    answered: number;
    total: number;
    // Whether every answer was right. Null until the last question is answered.
    allCorrect: boolean | null;
  };
}

// The child answers one question of an attempt and is told at once if it is right, which
// answer was right, and why. A question can be answered once in an attempt. When the last
// question is answered the attempt is completed.
export async function answerQuestion(
  pool: Queryable,
  {
    user,
    lessonId,
    attemptId,
    questionId,
    optionId,
  }: { user: AuthUser; lessonId: string; attemptId: string; questionId: string; optionId: string },
): Promise<AnswerResult> {
  const quiz = await studentQuiz(pool, user, lessonId);

  return inTransaction(pool, async (db) => {
    const { rows: found } = await db.query<AttemptRow>(
      `SELECT * FROM quiz_attempts
       WHERE id = $1 AND lesson_id = $2 AND student_id = $3 FOR UPDATE`,
      [attemptId, lessonId, user.id],
    );
    const attempt = found[0];
    if (!attempt) {
      throw notFound();
    }
    if (attempt.status !== 'in_progress') {
      throw new HttpError(409, 'attempt_finished', 'This try is finished. Start a new one.');
    }
    if (!matchesQuiz(attempt.order_data, quiz)) {
      throw new HttpError(
        409,
        'quiz_changed',
        'The quiz was changed by the teacher. Start the quiz again.',
      );
    }
    const place = attempt.order_data.questions.indexOf(questionId);
    if (place === -1) {
      throw new HttpError(400, 'invalid_question', 'That question is not in this try.');
    }
    if (!attempt.order_data.options[questionId].includes(optionId)) {
      throw new HttpError(400, 'invalid_option', 'That answer does not belong to the question.');
    }

    const { rows: options } = await db.query<{ id: string; text: string; is_correct: boolean }>(
      'SELECT id, text, is_correct FROM quiz_options WHERE question_id = $1',
      [questionId],
    );
    const { rows: questions } = await db.query<{
      kind: 'choice' | 'true_false';
      prompt: string;
      explanation: string | null;
    }>('SELECT kind, prompt, explanation FROM quiz_questions WHERE id = $1', [questionId]);
    const chosen = options.find((option) => option.id === optionId);
    const right = options.find((option) => option.is_correct);
    if (!chosen || !right || !questions[0]) {
      throw new HttpError(
        409,
        'quiz_changed',
        'The quiz was changed by the teacher. Start the quiz again.',
      );
    }

    const { rows: saved } = await db.query(
      `INSERT INTO quiz_answers (
         attempt_id, position, question_id, option_id, question_kind, question_prompt,
         chosen_text, correct_text, explanation, is_correct
       ) VALUES ($1, $2, $3, $4, $5::quiz_question_kind, $6, $7, $8, $9, $10)
       ON CONFLICT (attempt_id, question_id) DO NOTHING
       RETURNING id`,
      [
        attemptId,
        place + 1,
        questionId,
        optionId,
        questions[0].kind,
        questions[0].prompt,
        chosen.text,
        right.text,
        questions[0].explanation,
        chosen.is_correct,
      ],
    );
    if (saved.length === 0) {
      throw new HttpError(
        409,
        'already_answered',
        'This question was already answered in this try.',
      );
    }

    const { rows: totals } = await db.query<{ answered: string; wrong: string }>(
      `SELECT count(*) AS answered, count(*) FILTER (WHERE NOT is_correct) AS wrong
       FROM quiz_answers WHERE attempt_id = $1`,
      [attemptId],
    );
    const answered = Number(totals[0].answered);
    const finished = answered === attempt.question_count;
    const allCorrect = finished ? Number(totals[0].wrong) === 0 : null;

    await db.query(
      finished
        ? `UPDATE quiz_attempts SET last_activity_at = now(), status = 'completed',
             completed_at = now(), all_correct = $2 WHERE id = $1`
        : 'UPDATE quiz_attempts SET last_activity_at = now() WHERE id = $1 AND $2::boolean IS NULL',
      [attemptId, allCorrect],
    );

    return {
      answer: {
        questionId,
        optionId,
        correct: chosen.is_correct,
        correctOptionId: right.id,
        explanation: questions[0].explanation,
      },
      attempt: {
        id: attemptId,
        status: finished ? 'completed' : 'in_progress',
        answered,
        total: attempt.question_count,
        allCorrect,
      },
    };
  });
}

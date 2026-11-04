import { AiUserError, type AiProvider } from '../ai/types.ts';
import { ContentError, validateQuiz, validateSummary } from '../ai/validate.ts';
import type { QuizContent, SummaryContent } from '../ai/types.ts';
import type { AuthUser } from '../auth/sessions.ts';
import type { Queryable } from '../db/pool.ts';
import { inTransaction } from '../db/transaction.ts';
import { HttpError } from '../http/errors.ts';
import type { BackgroundJobs } from './jobs.ts';
import { assertEditable, getLesson, requireOwnedLesson, type Lesson } from './lessons.ts';

// An answer that takes longer than this is given up, so a lesson is never stuck in
// "processing" because an AI service hangs.
const DEFAULT_AI_TIMEOUT_MS = 120_000;

export interface GenerationOptions {
  ai: AiProvider;
  jobs: BackgroundJobs;
  timeoutMs?: number;
}

function withTimeout<T>(work: Promise<T>, milliseconds: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('The AI took too long to answer.')), milliseconds);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

// What the teacher is told when it fails. Details of an AI service stay in the server log.
function messageFor(error: unknown): string {
  if (error instanceof AiUserError) {
    return error.message;
  }
  if (error instanceof ContentError) {
    return `The AI answered in a form that could not be used (${error.message}) Try again.`;
  }
  return 'The AI could not make the summary and the quiz. Try again in a moment.';
}

// Starts making the summary and/or the quiz of a lesson with the AI, and returns at once with
// the lesson in the state "processing". The work goes on in the background; when it is
// finished the lesson is "in review" (the teacher reads, edits and approves what was made) or
// back to a draft with the reason in `processingError`.
export async function startGeneration(
  pool: Queryable,
  options: GenerationOptions,
  {
    user,
    lessonId,
    summary,
    quiz,
  }: { user: AuthUser; lessonId: string; summary: boolean; quiz: boolean },
): Promise<Lesson> {
  assertEditable(await requireOwnedLesson(pool, { user, lessonId }));

  // One statement decides, so two clicks at once start only one job.
  const { rows } = await pool.query<{ body: string; body_revision: number }>(
    `UPDATE lessons SET status = 'processing', processing_error = NULL, updated_at = now()
     WHERE id = $1 AND school_id = $2 AND status IN ('draft', 'in_review')
       AND body ~ '[^[:space:]]'
     RETURNING body, body_revision`,
    [lessonId, user.schoolId],
  );
  if (!rows[0]) {
    const current = await requireOwnedLesson(pool, { user, lessonId });
    assertEditable(current);
    throw new HttpError(
      409,
      'lesson_has_no_text',
      'Add the text of the lesson before asking the AI to work on it.',
    );
  }

  const job = {
    schoolId: user.schoolId,
    lessonId,
    text: rows[0].body,
    revision: rows[0].body_revision,
  };
  options.jobs.run(() => runGeneration(pool, options, { ...job, summary, quiz }));

  return getLesson(pool, { user, lessonId });
}

async function runGeneration(
  pool: Queryable,
  { ai, timeoutMs = DEFAULT_AI_TIMEOUT_MS }: GenerationOptions,
  job: {
    schoolId: string;
    lessonId: string;
    text: string;
    revision: number;
    summary: boolean;
    quiz: boolean;
  },
): Promise<void> {
  try {
    const [summary, quiz] = await Promise.all([
      job.summary
        ? withTimeout(ai.makeSummary({ text: job.text }), timeoutMs).then(validateSummary)
        : null,
      job.quiz ? withTimeout(ai.makeQuiz({ text: job.text }), timeoutMs).then(validateQuiz) : null,
    ]);

    await inTransaction(pool, (db) => saveResults(db, job, { summary, quiz }));
  } catch (error) {
    console.error(
      `Making the summary and quiz of lesson ${job.lessonId} failed (${ai.name}):`,
      error,
    );
    await pool.query(
      `UPDATE lessons SET status = 'draft', processing_error = $2, updated_at = now()
       WHERE id = $1 AND status = 'processing'`,
      [job.lessonId, messageFor(error)],
    );
  }
}

// Replaces the summary and/or the quiz of the lesson with what the AI made. They start as
// drafts: a teacher must approve them. The lesson moves on to "in review".
async function saveResults(
  db: Queryable,
  job: { schoolId: string; lessonId: string; revision: number },
  results: { summary: SummaryContent | null; quiz: QuizContent | null },
): Promise<void> {
  if (results.summary) {
    await db.query(
      `INSERT INTO lesson_summaries (lesson_id, school_id, points, origin, based_on_revision)
       VALUES ($1, $2, $3, 'ai', $4)
       ON CONFLICT (lesson_id) DO UPDATE SET
         points = EXCLUDED.points, origin = 'ai', status = 'draft',
         based_on_revision = EXCLUDED.based_on_revision,
         approved_by = NULL, approved_at = NULL, updated_at = now()`,
      [job.lessonId, job.schoolId, results.summary.points, job.revision],
    );
  }

  if (results.quiz) {
    await db.query(
      `INSERT INTO lesson_quizzes (lesson_id, school_id, origin, based_on_revision)
       VALUES ($1, $2, 'ai', $3)
       ON CONFLICT (lesson_id) DO UPDATE SET
         origin = 'ai', status = 'draft', based_on_revision = EXCLUDED.based_on_revision,
         approved_by = NULL, approved_at = NULL, updated_at = now()`,
      [job.lessonId, job.schoolId, job.revision],
    );
    await db.query('DELETE FROM quiz_questions WHERE lesson_id = $1', [job.lessonId]);

    for (const [index, question] of results.quiz.questions.entries()) {
      const { rows } = await db.query<{ id: string }>(
        `INSERT INTO quiz_questions (lesson_id, position, kind, prompt, explanation)
         VALUES ($1, $2, $3::quiz_question_kind, $4, $5) RETURNING id`,
        [job.lessonId, index + 1, question.kind, question.prompt, question.explanation],
      );
      for (const [optionIndex, option] of question.options.entries()) {
        await db.query(
          `INSERT INTO quiz_options (question_id, position, text, is_correct)
           VALUES ($1, $2, $3, $4)`,
          [rows[0].id, optionIndex + 1, option.text, option.isCorrect],
        );
      }
    }
  }

  await db.query(
    `UPDATE lessons SET status = 'in_review', processing_error = NULL, updated_at = now()
     WHERE id = $1 AND status = 'processing'`,
    [job.lessonId],
  );
}

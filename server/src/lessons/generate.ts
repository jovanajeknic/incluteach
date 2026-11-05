import { AiUserError, type AiProvider } from '../ai/types.ts';
import { ContentError, validateQuiz, validateSummary } from '../ai/validate.ts';
import type { QuizContent, SummaryContent } from '../ai/types.ts';
import type { AuthUser } from '../auth/sessions.ts';
import type { Queryable } from '../db/pool.ts';
import { inTransaction } from '../db/transaction.ts';
import { HttpError } from '../http/errors.ts';
import { writeQuiz, writeSummary } from './contentWrite.ts';
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
    // One after the other, not together: a real service limits how much text it takes in a
    // minute, and two requests with the whole lesson at once would use that up twice as fast.
    // If the summary fails the quiz is not tried, since the teacher has to start again anyway.
    const summary = job.summary
      ? validateSummary(await withTimeout(ai.makeSummary({ text: job.text }), timeoutMs))
      : null;
    const quiz = job.quiz
      ? validateQuiz(await withTimeout(ai.makeQuiz({ text: job.text }), timeoutMs))
      : null;

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
  const common = {
    schoolId: job.schoolId,
    lessonId: job.lessonId,
    revision: job.revision,
    origin: 'ai' as const,
    keepOrigin: false,
  };
  if (results.summary) {
    await writeSummary(db, { ...common, content: results.summary });
  }
  if (results.quiz) {
    await writeQuiz(db, { ...common, content: results.quiz });
  }

  await db.query(
    `UPDATE lessons SET status = 'in_review', processing_error = NULL, updated_at = now()
     WHERE id = $1 AND status = 'processing'`,
    [job.lessonId],
  );
}

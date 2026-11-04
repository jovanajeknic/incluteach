import type { Queryable } from '../db/pool.ts';

export interface SummaryView {
  points: string[];
  origin: 'ai' | 'teacher';
  status: 'draft' | 'approved';
  // The text of the lesson changed after this was made or approved.
  outdated: boolean;
  approvedAt: string | null;
  updatedAt: string;
}

export interface QuizOptionView {
  id: string;
  position: number;
  text: string;
  // Only the teacher gets to know which answer is right. A student finds out by answering.
  isCorrect?: boolean;
}

export interface QuizQuestionView {
  id: string;
  position: number;
  kind: 'choice' | 'true_false';
  prompt: string;
  // Explains the right answer; the teacher sees it now, a student after answering.
  explanation?: string | null;
  options: QuizOptionView[];
}

export interface QuizView {
  origin: 'ai' | 'teacher';
  status: 'draft' | 'approved';
  outdated: boolean;
  approvedAt: string | null;
  updatedAt: string;
  questions: QuizQuestionView[];
}

interface SummaryRow {
  points: string[];
  origin: 'ai' | 'teacher';
  status: 'draft' | 'approved';
  based_on_revision: number;
  approved_at: Date | null;
  updated_at: Date;
}

interface QuizRow {
  origin: 'ai' | 'teacher';
  status: 'draft' | 'approved';
  based_on_revision: number;
  approved_at: Date | null;
  updated_at: Date;
}

// The summary and the quiz of a lesson. The teacher sees them in every state, with the answers.
// Everybody else sees only what a teacher approved and that still fits the text, and without
// the right answers.
export async function loadContent(
  pool: Queryable,
  {
    lessonId,
    bodyRevision,
    forTeacher,
  }: { lessonId: string; bodyRevision: number; forTeacher: boolean },
): Promise<{ summary: SummaryView | null; quiz: QuizView | null }> {
  const visible = (status: string, revision: number) =>
    forTeacher || (status === 'approved' && revision === bodyRevision);

  const { rows: summaryRows } = await pool.query<SummaryRow>(
    `SELECT points, origin, status, based_on_revision, approved_at, updated_at
     FROM lesson_summaries WHERE lesson_id = $1`,
    [lessonId],
  );
  const summaryRow = summaryRows[0];
  const summary =
    summaryRow && visible(summaryRow.status, summaryRow.based_on_revision)
      ? {
          points: summaryRow.points,
          origin: summaryRow.origin,
          status: summaryRow.status,
          outdated: summaryRow.based_on_revision !== bodyRevision,
          approvedAt: summaryRow.approved_at?.toISOString() ?? null,
          updatedAt: summaryRow.updated_at.toISOString(),
        }
      : null;

  const { rows: quizRows } = await pool.query<QuizRow>(
    `SELECT origin, status, based_on_revision, approved_at, updated_at
     FROM lesson_quizzes WHERE lesson_id = $1`,
    [lessonId],
  );
  const quizRow = quizRows[0];
  if (!quizRow || !visible(quizRow.status, quizRow.based_on_revision)) {
    return { summary, quiz: null };
  }

  const { rows: questions } = await pool.query<{
    id: string;
    position: number;
    kind: 'choice' | 'true_false';
    prompt: string;
    explanation: string | null;
  }>(
    `SELECT id, position, kind, prompt, explanation FROM quiz_questions
     WHERE lesson_id = $1 ORDER BY position`,
    [lessonId],
  );
  const { rows: options } = await pool.query<{
    id: string;
    question_id: string;
    position: number;
    text: string;
    is_correct: boolean;
  }>(
    `SELECT o.id, o.question_id, o.position, o.text, o.is_correct
     FROM quiz_options o JOIN quiz_questions q ON q.id = o.question_id
     WHERE q.lesson_id = $1 ORDER BY o.position`,
    [lessonId],
  );

  return {
    summary,
    quiz: {
      origin: quizRow.origin,
      status: quizRow.status,
      outdated: quizRow.based_on_revision !== bodyRevision,
      approvedAt: quizRow.approved_at?.toISOString() ?? null,
      updatedAt: quizRow.updated_at.toISOString(),
      questions: questions.map((question) => ({
        id: question.id,
        position: question.position,
        kind: question.kind,
        prompt: question.prompt,
        ...(forTeacher ? { explanation: question.explanation } : {}),
        options: options
          .filter((option) => option.question_id === question.id)
          .map((option) => ({
            id: option.id,
            position: option.position,
            text: option.text,
            ...(forTeacher ? { isCorrect: option.is_correct } : {}),
          })),
      })),
    },
  };
}

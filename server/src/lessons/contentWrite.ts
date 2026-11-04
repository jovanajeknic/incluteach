import type { QuizContent, SummaryContent } from '../ai/types.ts';
import type { Queryable } from '../db/pool.ts';

// Writes a summary into the database as a draft. It is used both when the AI made it and when a
// teacher writes or edits it. Either way it starts as a draft with no approval, and is
// based on the revision of the text it was made for. `origin` says who wrote it first; when a
// teacher edits what the AI made, `keepOrigin` leaves it as "ai", so the screens can go on
// saying where it came from until it is approved.
export async function writeSummary(
  db: Queryable,
  {
    schoolId,
    lessonId,
    revision,
    content,
    origin,
    keepOrigin,
  }: {
    schoolId: string;
    lessonId: string;
    revision: number;
    content: SummaryContent;
    origin: 'ai' | 'teacher';
    keepOrigin: boolean;
  },
): Promise<void> {
  await db.query(
    `INSERT INTO lesson_summaries (lesson_id, school_id, points, origin, based_on_revision)
     VALUES ($1, $2, $3, $4::content_origin, $5)
     ON CONFLICT (lesson_id) DO UPDATE SET
       points = EXCLUDED.points,
       origin = CASE WHEN $6 THEN lesson_summaries.origin ELSE EXCLUDED.origin END,
       status = 'draft', based_on_revision = EXCLUDED.based_on_revision,
       approved_by = NULL, approved_at = NULL, updated_at = now()`,
    [lessonId, schoolId, content.points, origin, revision, keepOrigin],
  );
}

// Same for a quiz, with all its questions and answers. The old questions are replaced.
export async function writeQuiz(
  db: Queryable,
  {
    schoolId,
    lessonId,
    revision,
    content,
    origin,
    keepOrigin,
  }: {
    schoolId: string;
    lessonId: string;
    revision: number;
    content: QuizContent;
    origin: 'ai' | 'teacher';
    keepOrigin: boolean;
  },
): Promise<void> {
  await db.query(
    `INSERT INTO lesson_quizzes (lesson_id, school_id, origin, based_on_revision)
     VALUES ($1, $2, $3::content_origin, $4)
     ON CONFLICT (lesson_id) DO UPDATE SET
       origin = CASE WHEN $5 THEN lesson_quizzes.origin ELSE EXCLUDED.origin END,
       status = 'draft', based_on_revision = EXCLUDED.based_on_revision,
       approved_by = NULL, approved_at = NULL, updated_at = now()`,
    [lessonId, schoolId, origin, revision, keepOrigin],
  );
  await db.query('DELETE FROM quiz_questions WHERE lesson_id = $1', [lessonId]);

  for (const [index, question] of content.questions.entries()) {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO quiz_questions (lesson_id, position, kind, prompt, explanation)
       VALUES ($1, $2, $3::quiz_question_kind, $4, $5) RETURNING id`,
      [lessonId, index + 1, question.kind, question.prompt, question.explanation],
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

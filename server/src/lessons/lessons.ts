import type { AuthUser } from '../auth/sessions.ts';
import type { Queryable } from '../db/pool.ts';
import { inTransaction } from '../db/transaction.ts';
import { resolveChild } from '../enrollments/enrollments.ts';
import { HttpError } from '../http/errors.ts';
import { lessonProgress, type LessonProgress } from '../quiz/progress.ts';
import { loadContent, type QuizView, type SummaryView } from './content.ts';

export type LessonStatus = 'draft' | 'processing' | 'in_review' | 'published';

interface LessonSubject {
  id: string;
  name: string;
  className: string;
  schoolYear: number;
}

export interface LessonListItem {
  id: string;
  title: string;
  status: LessonStatus;
  subject: LessonSubject;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Lesson extends Omit<LessonListItem, 'subject'> {
  body: string;
  source: 'pasted' | 'docx' | 'pdf';
  // The name of the file the text came from, if it came from a file.
  sourceFileName: string | null;
  // Goes up by one whenever the text changes.
  bodyRevision: number;
  // Why the last attempt of the AI failed, shown to the teacher; null if it did not.
  processingError: string | null;
  subject: LessonSubject & { teacher: { id: string; fullName: string } };
  // What the AI or the teacher made. The teacher sees all of it; a student or a parent only
  // what a teacher approved, and without the right answers.
  summary: SummaryView | null;
  quiz: QuizView | null;
  // Where the signed-in student stands in this lesson; null for everybody else. See
  // docs/LESSONS.md, "Finishing a lesson".
  myProgress: LessonProgress | null;
}

interface LessonRow {
  id: string;
  title: string;
  status: LessonStatus;
  body?: string;
  source?: 'pasted' | 'docx' | 'pdf';
  source_file_name?: string | null;
  body_revision?: number;
  processing_error?: string | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
  subject_id: string;
  subject_name: string;
  class_name: string;
  school_year: number;
  teacher_id: string;
  teacher_name: string;
}

const LIST_COLUMNS = `l.id, l.title, l.status, l.published_at, l.created_at, l.updated_at,
    s.id AS subject_id, s.name AS subject_name, c.name AS class_name, c.school_year,
    t.id AS teacher_id, t.full_name AS teacher_name`;

const FROM = `FROM lessons l
  JOIN subjects s ON s.id = l.subject_id
  JOIN classes c ON c.id = s.class_id
  JOIN users t ON t.id = s.teacher_id`;

function toListItem(row: LessonRow): LessonListItem {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    subject: {
      id: row.subject_id,
      name: row.subject_name,
      className: row.class_name,
      schoolYear: row.school_year,
    },
    publishedAt: row.published_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function toLesson(
  row: LessonRow,
  content: { summary: SummaryView | null; quiz: QuizView | null },
  forTeacher: boolean,
  myProgress: LessonProgress | null,
): Lesson {
  const item = toListItem(row);
  return {
    ...item,
    ...content,
    myProgress,
    // Only the teacher is told why the AI failed.
    processingError: forTeacher ? (row.processing_error ?? null) : null,
    body: row.body as string,
    source: row.source as Lesson['source'],
    sourceFileName: row.source_file_name ?? null,
    bodyRevision: row.body_revision as number,
    subject: { ...item.subject, teacher: { id: row.teacher_id, fullName: row.teacher_name } },
  };
}

const lessonNotFound = () => new HttpError(404, 'not_found', 'Lesson not found.');

// What each person may see of lessons:
// - a teacher: every lesson of the subjects they teach, in any state;
// - a student: published lessons of the subjects they joined (an approved enrollment);
// - a parent: published lessons of the subjects any of their children joined.
// The school admin sees no lessons.
function accessCondition(user: AuthUser, params: unknown[], studentId?: string): string {
  params.push(user.id);
  const me = `$${params.length}`;

  if (user.role === 'teacher') {
    return `s.teacher_id = ${me}`;
  }
  if (user.role === 'student') {
    return `l.status = 'published' AND EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.student_id = ${me} AND e.subject_id = l.subject_id AND e.status = 'approved')`;
  }
  if (user.role === 'parent') {
    let narrowing = '';
    if (studentId) {
      params.push(studentId);
      narrowing = `AND ps.student_id = $${params.length}`;
    }
    return `l.status = 'published' AND EXISTS (
      SELECT 1 FROM parent_students ps
      JOIN enrollments e ON e.student_id = ps.student_id AND e.status = 'approved'
      WHERE ps.parent_id = ${me} ${narrowing} AND e.subject_id = l.subject_id)`;
  }
  throw new HttpError(403, 'forbidden', 'You are not allowed to do this.');
}

export interface ListLessonsOptions {
  user: AuthUser;
  subjectId?: string;
  status?: LessonStatus;
  // For a parent: only the lessons of the subjects this child joined.
  studentId?: string;
  limit: number;
  offset: number;
}

export async function listLessons(
  pool: Queryable,
  options: ListLessonsOptions,
): Promise<{ lessons: LessonListItem[]; total: number }> {
  const { user } = options;
  const params: unknown[] = [user.schoolId];
  const conditions = ['l.school_id = $1'];

  const child =
    user.role === 'parent' && options.studentId
      ? await resolveChild(pool, user, options.studentId)
      : undefined;
  conditions.push(accessCondition(user, params, child));

  if (options.subjectId) {
    params.push(options.subjectId);
    conditions.push(`l.subject_id = $${params.length}`);
  }
  if (options.status) {
    params.push(options.status);
    conditions.push(`l.status = $${params.length}`);
  }
  const where = conditions.join(' AND ');

  const { rows: counted } = await pool.query<{ total: string }>(
    `SELECT count(*) AS total ${FROM} WHERE ${where}`,
    params,
  );
  const { rows } = await pool.query<LessonRow>(
    `SELECT ${LIST_COLUMNS} ${FROM} WHERE ${where}
     ORDER BY coalesce(l.published_at, l.updated_at) DESC, l.id
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, options.limit, options.offset],
  );

  return { lessons: rows.map(toListItem), total: Number(counted[0].total) };
}

const DETAIL_COLUMNS = `${LIST_COLUMNS}, l.body, l.source, l.source_file_name, l.body_revision, l.processing_error`;

// A lesson the person may see, or a 404 as if it did not exist.
export async function getLesson(
  pool: Queryable,
  { user, lessonId }: { user: AuthUser; lessonId: string },
): Promise<Lesson> {
  const params: unknown[] = [user.schoolId, lessonId];
  const access = accessCondition(user, params);

  const { rows } = await pool.query<LessonRow>(
    `SELECT ${DETAIL_COLUMNS} ${FROM} WHERE l.school_id = $1 AND l.id = $2 AND ${access}`,
    params,
  );
  if (!rows[0]) {
    throw lessonNotFound();
  }
  const content = await loadContent(pool, {
    lessonId,
    bodyRevision: rows[0].body_revision as number,
    forTeacher: user.role === 'teacher',
  });
  const myProgress =
    user.role === 'student'
      ? await lessonProgress(pool, { studentId: user.id, lessonId, quiz: content.quiz })
      : null;
  return toLesson(rows[0], content, user.role === 'teacher', myProgress);
}

export async function requireOwnedLesson(
  pool: Queryable,
  { user, lessonId }: { user: AuthUser; lessonId: string },
): Promise<Lesson> {
  // Only the teacher of the subject gets this far; everybody else sees a 404.
  if (user.role !== 'teacher') {
    throw lessonNotFound();
  }
  return getLesson(pool, { user, lessonId });
}

export async function createLesson(
  pool: Queryable,
  {
    user,
    subjectId,
    title,
    body,
  }: { user: AuthUser; subjectId: string; title: string; body: string },
): Promise<Lesson> {
  const { rows: subjects } = await pool.query(
    'SELECT 1 FROM subjects WHERE id = $1 AND school_id = $2 AND teacher_id = $3',
    [subjectId, user.schoolId, user.id],
  );
  if (subjects.length === 0) {
    throw new HttpError(400, 'invalid_subject', 'Choose one of the subjects you teach.');
  }

  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO lessons (school_id, subject_id, created_by, title, body)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [user.schoolId, subjectId, user.id, title, body],
  );
  return getLesson(pool, { user, lessonId: rows[0].id });
}

// While a lesson is published students read it, and while the AI works on it nobody should
// change it under the AI's feet.
export function assertEditable(lesson: Lesson): void {
  if (lesson.status === 'published') {
    throw new HttpError(
      409,
      'lesson_published',
      'Take the lesson back to a draft before changing it.',
    );
  }
  if (lesson.status === 'processing') {
    throw new HttpError(
      409,
      'lesson_busy',
      'The lesson is being processed. Try again in a moment.',
    );
  }
}

// Changes the title, the text, or both. When the text really changes its revision goes up,
// which marks a summary or a quiz made from the older text as outdated.
export async function updateLesson(
  pool: Queryable,
  {
    user,
    lessonId,
    title,
    body,
  }: { user: AuthUser; lessonId: string; title?: string; body?: string },
): Promise<Lesson> {
  const current = await requireOwnedLesson(pool, { user, lessonId });
  assertEditable(current);

  await pool.query(
    `UPDATE lessons SET
       title = coalesce($2, title),
       body = coalesce($3, body),
       body_revision = body_revision + (CASE WHEN $3::text IS NOT NULL AND $3 <> body THEN 1 ELSE 0 END),
       updated_at = now()
     WHERE id = $1 AND school_id = $4 AND status = $5`,
    [lessonId, title ?? null, body ?? null, user.schoolId, current.status],
  );
  return getLesson(pool, { user, lessonId });
}

// Puts the text taken out of a Word or PDF file into the lesson, in place of what was there,
// and remembers where it came from. The teacher then reads it and corrects it. Same rules as
// for other changes: not while the lesson is published or being processed.
export async function setBodyFromFile(
  pool: Queryable,
  {
    user,
    lessonId,
    text,
    source,
    fileName,
  }: {
    user: AuthUser;
    lessonId: string;
    text: string;
    source: 'docx' | 'pdf';
    fileName: string | null;
  },
): Promise<Lesson> {
  const current = await requireOwnedLesson(pool, { user, lessonId });
  assertEditable(current);

  const { rows } = await pool.query(
    `UPDATE lessons SET
       body = $2,
       body_revision = body_revision + (CASE WHEN body <> $2 THEN 1 ELSE 0 END),
       source = $3::lesson_source,
       source_file_name = $4,
       updated_at = now()
     WHERE id = $1 AND school_id = $5 AND status = $6
     RETURNING id`,
    [lessonId, text, source, fileName, user.schoolId, current.status],
  );
  if (rows.length === 0) {
    throw new HttpError(409, 'wrong_state', 'The lesson changed in the meantime. Try again.');
  }
  return getLesson(pool, { user, lessonId });
}

export async function deleteLesson(
  pool: Queryable,
  { user, lessonId }: { user: AuthUser; lessonId: string },
): Promise<void> {
  const current = await requireOwnedLesson(pool, { user, lessonId });
  assertEditable(current);

  await pool.query('DELETE FROM lessons WHERE id = $1 AND school_id = $2', [
    lessonId,
    user.schoolId,
  ]);
}

// Makes the lesson visible to students. It needs some text, and a summary or a quiz that
// exists must be approved and made from the current text: nothing the AI made reaches
// students without a teacher's approval.
export async function publishLesson(
  pool: Queryable,
  { user, lessonId }: { user: AuthUser; lessonId: string },
): Promise<Lesson> {
  await requireOwnedLesson(pool, { user, lessonId });

  await inTransaction(pool, async (db) => {
    // Locks the lesson, so nobody changes the text between the checks and the publishing.
    const { rows } = await db.query<{
      status: LessonStatus;
      has_text: boolean;
      revision: number;
      summary_status: string | null;
      summary_revision: number | null;
      quiz_status: string | null;
      quiz_revision: number | null;
    }>(
      `SELECT l.status, l.body ~ '[^[:space:]]' AS has_text, l.body_revision AS revision,
         ls.status AS summary_status, ls.based_on_revision AS summary_revision,
         lq.status AS quiz_status, lq.based_on_revision AS quiz_revision
       FROM lessons l
       LEFT JOIN lesson_summaries ls ON ls.lesson_id = l.id
       LEFT JOIN lesson_quizzes lq ON lq.lesson_id = l.id
       WHERE l.id = $1 AND l.school_id = $2
       FOR UPDATE OF l`,
      [lessonId, user.schoolId],
    );
    const lesson = rows[0];

    if (lesson.status === 'processing') {
      throw new HttpError(
        409,
        'lesson_busy',
        'The lesson is being processed. Try again in a moment.',
      );
    }
    if (lesson.status === 'published') {
      throw new HttpError(409, 'wrong_state', 'The lesson is already published.');
    }
    if (!lesson.has_text) {
      throw new HttpError(
        409,
        'lesson_has_no_text',
        'Add the text of the lesson before publishing.',
      );
    }

    for (const [status, revision] of [
      [lesson.summary_status, lesson.summary_revision],
      [lesson.quiz_status, lesson.quiz_revision],
    ] as const) {
      if (status === null) {
        continue; // Not made, so it is simply not part of the lesson.
      }
      if (revision !== lesson.revision) {
        throw new HttpError(
          409,
          'content_outdated',
          'The text changed after the summary or the quiz was made. Make them again or fix and approve them.',
        );
      }
      if (status !== 'approved') {
        throw new HttpError(
          409,
          'needs_approval',
          'Approve the summary and the quiz, or remove them, before publishing.',
        );
      }
    }

    await db.query(
      `UPDATE lessons SET status = 'published', published_at = now(), processing_error = NULL,
         updated_at = now()
       WHERE id = $1`,
      [lessonId],
    );
  });

  return getLesson(pool, { user, lessonId });
}

// Takes a published lesson back to a draft, so students no longer see it and the teacher
// can change it.
export async function unpublishLesson(
  pool: Queryable,
  { user, lessonId }: { user: AuthUser; lessonId: string },
): Promise<Lesson> {
  await requireOwnedLesson(pool, { user, lessonId });

  const { rows } = await pool.query(
    `UPDATE lessons SET status = 'draft', published_at = NULL, updated_at = now()
     WHERE id = $1 AND school_id = $2 AND status = 'published'
     RETURNING id`,
    [lessonId, user.schoolId],
  );
  if (rows.length === 0) {
    throw new HttpError(409, 'wrong_state', 'The lesson is not published.');
  }
  return getLesson(pool, { user, lessonId });
}

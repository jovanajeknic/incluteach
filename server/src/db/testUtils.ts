import { randomUUID } from 'node:crypto';

import type pg from 'pg';

import { hashPassword } from '../auth/password.ts';
import type { UserRole } from '../roles.ts';

// Runs a test body in a transaction that is always rolled back, so tests
// that write to the real local database leave no data behind.
export async function inRolledBackTransaction(
  pool: pg.Pool,
  run: (client: pg.PoolClient) => Promise<void>,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await run(client);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
}

export async function insertSchool(client: pg.PoolClient, name = 'Test School'): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    'INSERT INTO schools (name) VALUES ($1) RETURNING id',
    [name],
  );
  return rows[0].id;
}

// Usernames are unique across all schools, so each call gets a random one by default.
export function randomUsername(): string {
  return `user_${randomUUID().slice(0, 8)}`;
}

export async function insertUser(
  client: pg.PoolClient,
  schoolId: string,
  role: UserRole,
  username: string = randomUsername(),
  fullName = 'Test User',
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO users (full_name, role, school_id, username)
     VALUES ($4, $1, $2, $3) RETURNING id`,
    [role, schoolId, username, fullName],
  );
  return rows[0].id;
}

export async function insertClass(
  client: pg.PoolClient,
  schoolId: string,
  name = '5-2',
  schoolYear = 2026,
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    'INSERT INTO classes (school_id, name, school_year) VALUES ($1, $2, $3) RETURNING id',
    [schoolId, name, schoolYear],
  );
  return rows[0].id;
}

export async function insertSubject(
  client: pg.PoolClient,
  schoolId: string,
  classId: string,
  teacherId: string,
  name = 'Matematika',
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO subjects (school_id, class_id, teacher_id, name)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [schoolId, classId, teacherId, name],
  );
  return rows[0].id;
}

export async function insertParentStudent(
  client: pg.PoolClient,
  schoolId: string,
  parentId: string,
  studentId: string,
  createdBy: string,
): Promise<void> {
  await client.query(
    `INSERT INTO parent_students (school_id, parent_id, student_id, created_by)
     VALUES ($1, $2, $3, $4)`,
    [schoolId, parentId, studentId, createdBy],
  );
}

export interface EnrollmentFields {
  schoolId: string;
  studentId: string;
  subjectId: string;
  requestedBy: string;
  requestedByRole: 'student' | 'parent';
  status?: 'awaiting_parent' | 'awaiting_teacher' | 'approved' | 'rejected';
  parentDecidedBy?: string;
  teacherDecidedBy?: string;
}

// Decision times are filled in automatically when the matching decision is given.
export async function insertEnrollment(
  client: pg.PoolClient,
  fields: EnrollmentFields,
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO enrollments (
       school_id, student_id, subject_id, requested_by, requested_by_role, status,
       parent_decided_by, parent_decided_at, teacher_decided_by, teacher_decided_at
     ) VALUES (
       $1, $2, $3, $4, $5, COALESCE($6::enrollment_status, 'awaiting_parent'),
       $7::uuid, CASE WHEN $7::uuid IS NULL THEN NULL ELSE now() END,
       $8::uuid, CASE WHEN $8::uuid IS NULL THEN NULL ELSE now() END
     ) RETURNING id`,
    [
      fields.schoolId,
      fields.studentId,
      fields.subjectId,
      fields.requestedBy,
      fields.requestedByRole,
      fields.status ?? null,
      fields.parentDecidedBy ?? null,
      fields.teacherDecidedBy ?? null,
    ],
  );
  return rows[0].id;
}

// Cheap hashing settings keep tests fast; sign-in reads the settings from the stored hash.
export const FAST_HASH_COST = { N: 1024, r: 8, p: 1 };

// A user who has already activated the account: with a password and an email.
export async function insertActivatedUser(
  client: pg.PoolClient,
  schoolId: string,
  role: UserRole,
  fields: { username: string; email: string; password: string; fullName?: string },
): Promise<string> {
  const passwordHash = await hashPassword(fields.password, FAST_HASH_COST);
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO users (full_name, role, school_id, username, email, password_hash)
     VALUES ($6, $1, $2, $3, $4, $5) RETURNING id`,
    [role, schoolId, fields.username, fields.email, passwordHash, fields.fullName ?? 'Test User'],
  );
  return rows[0].id;
}

export interface LessonFields {
  schoolId: string;
  subjectId: string;
  createdBy: string;
  title?: string;
  body?: string;
  status?: 'draft' | 'processing' | 'in_review' | 'published';
  publishedAt?: string | null;
}

export async function insertLesson(client: pg.PoolClient, fields: LessonFields): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO lessons (school_id, subject_id, created_by, title, body, status, published_at)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6::lesson_status, 'draft'), $7::timestamptz)
     RETURNING id`,
    [
      fields.schoolId,
      fields.subjectId,
      fields.createdBy,
      fields.title ?? 'Fotosinteza',
      fields.body ?? 'Biljke prave hranu uz pomoć svjetlosti.',
      fields.status ?? null,
      fields.publishedAt ?? null,
    ],
  );
  return rows[0].id;
}

export async function insertSummary(
  client: pg.PoolClient,
  fields: {
    schoolId: string;
    lessonId: string;
    points?: string[];
    status?: 'draft' | 'approved';
    approvedBy?: string | null;
    approvedAt?: string | null;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO lesson_summaries
       (lesson_id, school_id, points, origin, status, based_on_revision, approved_by, approved_at)
     VALUES ($1, $2, $3, 'ai', COALESCE($4::content_status, 'draft'), 1, $5, $6::timestamptz)`,
    [
      fields.lessonId,
      fields.schoolId,
      fields.points ?? ['Biljke prave hranu uz pomoć svjetlosti.'],
      fields.status ?? null,
      fields.approvedBy ?? null,
      fields.approvedAt ?? null,
    ],
  );
}

export async function insertQuiz(
  client: pg.PoolClient,
  fields: {
    schoolId: string;
    lessonId: string;
    status?: 'draft' | 'approved';
    approvedBy?: string | null;
    approvedAt?: string | null;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO lesson_quizzes
       (lesson_id, school_id, origin, status, based_on_revision, approved_by, approved_at)
     VALUES ($1, $2, 'ai', COALESCE($3::content_status, 'draft'), 1, $4, $5::timestamptz)`,
    [
      fields.lessonId,
      fields.schoolId,
      fields.status ?? null,
      fields.approvedBy ?? null,
      fields.approvedAt ?? null,
    ],
  );
}

export async function insertQuestion(
  client: pg.PoolClient,
  fields: {
    lessonId: string;
    position?: number;
    kind?: 'choice' | 'true_false';
    prompt?: string;
  },
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO quiz_questions (lesson_id, position, kind, prompt)
     VALUES ($1, $2, $3::quiz_question_kind, $4) RETURNING id`,
    [
      fields.lessonId,
      fields.position ?? 1,
      fields.kind ?? 'choice',
      fields.prompt ?? 'Gdje nastaje glukoza?',
    ],
  );
  return rows[0].id;
}

export async function insertOption(
  client: pg.PoolClient,
  fields: { questionId: string; position?: number; text?: string; isCorrect?: boolean },
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO quiz_options (question_id, position, text, is_correct)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [fields.questionId, fields.position ?? 1, fields.text ?? 'u lisu', fields.isCorrect ?? false],
  );
  return rows[0].id;
}

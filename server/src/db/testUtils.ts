import type pg from 'pg';

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

export async function insertUser(
  client: pg.PoolClient,
  schoolId: string,
  role: UserRole,
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO users (full_name, role, school_id) VALUES ('Test User', $1, $2) RETURNING id`,
    [role, schoolId],
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

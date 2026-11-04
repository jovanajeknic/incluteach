import type { AuthUser } from '../auth/sessions.ts';
import type { Queryable } from '../db/pool.ts';
import { HttpError } from '../http/errors.ts';

export type EnrollmentStatus = 'awaiting_parent' | 'awaiting_teacher' | 'approved' | 'rejected';

export interface Enrollment {
  id: string;
  status: EnrollmentStatus;
  student: { id: string; fullName: string };
  subject: {
    id: string;
    name: string;
    className: string;
    schoolYear: number;
    teacher: { id: string; fullName: string; deleted: boolean };
  };
  // Who sent the request. A parent's request counts as the parent's confirmation.
  requestedBy: 'student' | 'parent';
  parentDecidedAt: string | null;
  teacherDecidedAt: string | null;
  createdAt: string;
}

interface EnrollmentRow {
  id: string;
  status: EnrollmentStatus;
  requested_by_role: 'student' | 'parent';
  parent_decided_at: Date | null;
  teacher_decided_at: Date | null;
  created_at: Date;
  student_id: string;
  student_name: string;
  subject_id: string;
  subject_name: string;
  class_name: string;
  school_year: number;
  teacher_id: string;
  teacher_name: string;
  teacher_deleted: boolean;
}

const SELECT = `SELECT e.id, e.status, e.requested_by_role, e.parent_decided_at,
    e.teacher_decided_at, e.created_at,
    st.id AS student_id, st.full_name AS student_name,
    s.id AS subject_id, s.name AS subject_name, c.name AS class_name, c.school_year,
    t.id AS teacher_id, t.full_name AS teacher_name, t.deleted_at IS NOT NULL AS teacher_deleted
  FROM enrollments e
  JOIN users st ON st.id = e.student_id
  JOIN subjects s ON s.id = e.subject_id
  JOIN classes c ON c.id = s.class_id
  JOIN users t ON t.id = s.teacher_id`;

function toEnrollment(row: EnrollmentRow): Enrollment {
  return {
    id: row.id,
    status: row.status,
    student: { id: row.student_id, fullName: row.student_name },
    subject: {
      id: row.subject_id,
      name: row.subject_name,
      className: row.class_name,
      schoolYear: row.school_year,
      teacher: { id: row.teacher_id, fullName: row.teacher_name, deleted: row.teacher_deleted },
    },
    requestedBy: row.requested_by_role,
    parentDecidedAt: row.parent_decided_at?.toISOString() ?? null,
    teacherDecidedAt: row.teacher_decided_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  };
}

const forbidden = () => new HttpError(403, 'forbidden', 'You are not allowed to do this.');

// Whether this parent is linked to this child by the school admin.
export async function isLinkedParent(
  pool: Queryable,
  { parentId, studentId }: { parentId: string; studentId: string },
): Promise<boolean> {
  const { rows } = await pool.query(
    'SELECT 1 FROM parent_students WHERE parent_id = $1 AND student_id = $2',
    [parentId, studentId],
  );
  return rows.length > 0;
}

// Works out which child a student or a parent is acting for. A student always acts for
// themselves. A parent must name a child, and it must be one of their own linked children:
// this is the rule that stops a parent from seeing or acting for somebody else's child.
export async function resolveChild(
  pool: Queryable,
  user: AuthUser,
  requestedStudentId: string | undefined,
): Promise<string> {
  if (user.role === 'student') {
    if (requestedStudentId !== undefined && requestedStudentId !== user.id) {
      throw forbidden();
    }
    return user.id;
  }

  if (!requestedStudentId) {
    throw new HttpError(400, 'invalid_student', 'Choose one of your children.');
  }
  if (!(await isLinkedParent(pool, { parentId: user.id, studentId: requestedStudentId }))) {
    throw forbidden();
  }
  return requestedStudentId;
}

export interface CatalogSubject {
  id: string;
  name: string;
  className: string;
  schoolYear: number;
  teacher: { id: string; fullName: string };
  // The newest request of this child for the subject, so the screen can show its status.
  request: { id: string; status: EnrollmentStatus } | null;
}

interface CatalogRow {
  id: string;
  name: string;
  class_name: string;
  school_year: number;
  teacher_id: string;
  teacher_name: string;
  request_id: string | null;
  request_status: EnrollmentStatus | null;
}

export interface SearchCatalogOptions {
  schoolId: string;
  studentId: string;
  schoolYear: number;
  // Only the subjects of this class.
  classId?: string;
  // Matches part of the subject, class or teacher name, ignoring letter case.
  search?: string;
  limit: number;
  offset: number;
}

// The subjects a child can ask to join: those of their own school and the chosen school year
// whose teacher is still active, because a request needs a teacher to decide on it.
export async function searchCatalog(
  pool: Queryable,
  options: SearchCatalogOptions,
): Promise<{ subjects: CatalogSubject[]; total: number }> {
  const params: unknown[] = [options.schoolId, options.schoolYear];
  const conditions = [
    's.school_id = $1',
    'c.school_year = $2',
    't.deactivated_at IS NULL',
    't.deleted_at IS NULL',
  ];
  if (options.classId) {
    params.push(options.classId);
    conditions.push(`s.class_id = $${params.length}`);
  }
  if (options.search) {
    params.push(options.search);
    // position() instead of LIKE, so "%" and "_" in the search are just characters.
    conditions.push(
      `position(lower($${params.length}) in lower(s.name || ' ' || c.name || ' ' || t.full_name)) > 0`,
    );
  }
  const where = conditions.join(' AND ');

  const { rows: counted } = await pool.query<{ total: string }>(
    `SELECT count(*) AS total FROM subjects s
     JOIN classes c ON c.id = s.class_id JOIN users t ON t.id = s.teacher_id
     WHERE ${where}`,
    params,
  );
  const { rows } = await pool.query<CatalogRow>(
    `SELECT s.id, s.name, c.name AS class_name, c.school_year, t.id AS teacher_id,
       t.full_name AS teacher_name, r.id AS request_id, r.status AS request_status
     FROM subjects s
     JOIN classes c ON c.id = s.class_id
     JOIN users t ON t.id = s.teacher_id
     LEFT JOIN LATERAL (
       SELECT e.id, e.status FROM enrollments e
       WHERE e.subject_id = s.id AND e.student_id = $${params.length + 1}
       ORDER BY (e.status = 'rejected'), e.created_at DESC
       LIMIT 1
     ) r ON true
     WHERE ${where}
     ORDER BY lower(s.name), lower(c.name), t.full_name, s.id
     LIMIT $${params.length + 2} OFFSET $${params.length + 3}`,
    [...params, options.studentId, options.limit, options.offset],
  );

  return {
    subjects: rows.map((row) => ({
      id: row.id,
      name: row.name,
      className: row.class_name,
      schoolYear: row.school_year,
      teacher: { id: row.teacher_id, fullName: row.teacher_name },
      request:
        row.request_id && row.request_status
          ? { id: row.request_id, status: row.request_status }
          : null,
    })),
    total: Number(counted[0].total),
  };
}

export async function findEnrollment(pool: Queryable, enrollmentId: string): Promise<Enrollment> {
  const { rows } = await pool.query<EnrollmentRow>(`${SELECT} WHERE e.id = $1`, [enrollmentId]);
  return toEnrollment(rows[0]);
}

// A student sends a request that first waits for a parent. A parent sends it for their own
// child, which already counts as the parent's confirmation, so it goes straight to the teacher.
export async function createEnrollment(
  pool: Queryable,
  { user, subjectId, studentId }: { user: AuthUser; subjectId: string; studentId: string },
): Promise<Enrollment> {
  const { rows: students } = await pool.query(
    `SELECT 1 FROM users WHERE id = $1 AND school_id = $2 AND role = 'student'
       AND deactivated_at IS NULL AND deleted_at IS NULL`,
    [studentId, user.schoolId],
  );
  if (students.length === 0) {
    throw new HttpError(400, 'invalid_student', 'Choose an active student of this school.');
  }

  const { rows: subjects } = await pool.query(
    `SELECT 1 FROM subjects s JOIN users t ON t.id = s.teacher_id
     WHERE s.id = $1 AND s.school_id = $2 AND t.deactivated_at IS NULL AND t.deleted_at IS NULL`,
    [subjectId, user.schoolId],
  );
  if (subjects.length === 0) {
    throw new HttpError(400, 'invalid_subject', 'Choose a subject of this school.');
  }

  const byParent = user.role === 'parent';
  if (!byParent) {
    // Every request needs a parent or guardian to confirm it, so a student with nobody
    // linked (or whose parents have all left) cannot start one. The admin links a guardian first.
    const { rows: parents } = await pool.query(
      `SELECT 1 FROM parent_students ps JOIN users p ON p.id = ps.parent_id
       WHERE ps.student_id = $1 AND p.deactivated_at IS NULL AND p.deleted_at IS NULL`,
      [studentId],
    );
    if (parents.length === 0) {
      throw new HttpError(
        409,
        'no_parent',
        'No parent or guardian is linked to this student. Ask the school admin.',
      );
    }
  }

  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO enrollments (
       school_id, student_id, subject_id, requested_by, requested_by_role, status,
       parent_decided_by, parent_decided_at
     ) VALUES (
       $1, $2, $3, $4, $5::user_role, $6::enrollment_status,
       CASE WHEN $5::user_role = 'parent' THEN $4::uuid END,
       CASE WHEN $5::user_role = 'parent' THEN now() END
     )
     ON CONFLICT (student_id, subject_id) WHERE status <> 'rejected' DO NOTHING
     RETURNING id`,
    [
      user.schoolId,
      studentId,
      subjectId,
      user.id,
      byParent ? 'parent' : 'student',
      byParent ? 'awaiting_teacher' : 'awaiting_parent',
    ],
  );
  if (!rows[0]) {
    throw new HttpError(
      409,
      'request_exists',
      'There is already a request for this subject that was not rejected.',
    );
  }
  return findEnrollment(pool, rows[0].id);
}

export interface ListEnrollmentsOptions {
  user: AuthUser;
  status?: EnrollmentStatus;
  subjectId?: string;
  // For a parent: only the requests of this child.
  studentId?: string;
  limit: number;
  offset: number;
}

// What each person may see:
// - a student: their own requests;
// - a parent: the requests of their linked children;
// - a teacher: the requests for the subjects they teach, but only once the parent has passed
//   them on (a request still waiting for the parent, or rejected by the parent, is not shown).
export async function listEnrollments(
  pool: Queryable,
  options: ListEnrollmentsOptions,
): Promise<{ enrollments: Enrollment[]; total: number }> {
  const { user } = options;
  const params: unknown[] = [user.schoolId];
  const conditions = ['e.school_id = $1'];
  const add = (condition: string, value: unknown) => {
    params.push(value);
    conditions.push(condition.replace('?', `$${params.length}`));
  };

  if (user.role === 'student') {
    add('e.student_id = ?', user.id);
  } else if (user.role === 'parent') {
    if (options.studentId) {
      add('e.student_id = ?', await resolveChild(pool, user, options.studentId));
    } else {
      add('e.student_id IN (SELECT student_id FROM parent_students WHERE parent_id = ?)', user.id);
    }
  } else if (user.role === 'teacher') {
    add('s.teacher_id = ?', user.id);
    conditions.push(
      `(e.status IN ('awaiting_teacher', 'approved')
        OR (e.status = 'rejected' AND e.teacher_decided_by IS NOT NULL))`,
    );
  } else {
    throw forbidden();
  }

  if (options.status) add('e.status = ?', options.status);
  if (options.subjectId) add('e.subject_id = ?', options.subjectId);
  const where = conditions.join(' AND ');

  const { rows: counted } = await pool.query<{ total: string }>(
    `SELECT count(*) AS total FROM enrollments e JOIN subjects s ON s.id = e.subject_id
     WHERE ${where}`,
    params,
  );
  const { rows } = await pool.query<EnrollmentRow>(
    `${SELECT} WHERE ${where}
     ORDER BY e.created_at DESC, e.id
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, options.limit, options.offset],
  );

  return { enrollments: rows.map(toEnrollment), total: Number(counted[0].total) };
}

export interface CatalogClass {
  id: string;
  name: string;
  schoolYear: number;
  // How many subjects of this class can be asked for.
  subjectCount: number;
}

// The classes a child can pick in the filter: classes of the school and school year that have
// at least one subject with an active teacher. Empty classes are left out.
export async function listCatalogClasses(
  pool: Queryable,
  { schoolId, schoolYear }: { schoolId: string; schoolYear: number },
): Promise<CatalogClass[]> {
  const { rows } = await pool.query<{
    id: string;
    name: string;
    school_year: number;
    subject_count: number;
  }>(
    `SELECT c.id, c.name, c.school_year, count(s.id)::int AS subject_count
     FROM classes c
     JOIN subjects s ON s.class_id = c.id
     JOIN users t ON t.id = s.teacher_id AND t.deactivated_at IS NULL AND t.deleted_at IS NULL
     WHERE c.school_id = $1 AND c.school_year = $2
     GROUP BY c.id
     ORDER BY lower(c.name), c.id`,
    [schoolId, schoolYear],
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    schoolYear: row.school_year,
    subjectCount: row.subject_count,
  }));
}

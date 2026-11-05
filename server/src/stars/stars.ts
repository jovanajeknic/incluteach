import type { AuthUser } from '../auth/sessions.ts';
import type { Queryable } from '../db/pool.ts';
import { resolveChild } from '../enrollments/enrollments.ts';
import { HttpError } from '../http/errors.ts';

export interface Star {
  id: string;
  // 'automatic' for finishing a lesson, 'teacher' for a star a teacher gave. A screen shows
  // them differently, so a child can tell them apart.
  source: 'automatic' | 'teacher';
  student: { id: string; fullName: string };
  subject: { id: string; name: string };
  // The lesson that was finished (automatic stars only).
  lesson: { id: string; title: string } | null;
  // Why the teacher gave it (teacher stars only).
  message: string | null;
  givenBy: { id: string; fullName: string } | null;
  createdAt: string;
}

interface StarRow {
  id: string;
  source: Star['source'];
  student_id: string;
  student_name: string;
  subject_id: string;
  subject_name: string;
  lesson_id: string | null;
  lesson_title: string | null;
  message: string | null;
  given_by: string | null;
  given_by_name: string | null;
  created_at: Date;
}

const FROM = `FROM stars st
  JOIN users u ON u.id = st.student_id
  JOIN subjects s ON s.id = st.subject_id
  LEFT JOIN lessons l ON l.id = st.lesson_id
  LEFT JOIN users g ON g.id = st.given_by`;

function toStar(row: StarRow): Star {
  return {
    id: row.id,
    source: row.source,
    student: { id: row.student_id, fullName: row.student_name },
    subject: { id: row.subject_id, name: row.subject_name },
    lesson: row.lesson_id ? { id: row.lesson_id, title: row.lesson_title as string } : null,
    message: row.message,
    givenBy: row.given_by ? { id: row.given_by, fullName: row.given_by_name as string } : null,
    createdAt: row.created_at.toISOString(),
  };
}

export interface ListStarsOptions {
  user: AuthUser;
  studentId?: string;
  subjectId?: string;
  limit: number;
  offset: number;
}

export interface StarList {
  stars: Star[];
  // How many there are in all (not only on this page), by kind.
  counts: { automatic: number; teacher: number };
}

// Who sees which stars:
// - a student: their own;
// - a parent: those of one of their linked children;
// - a teacher: those of students in the subjects they teach;
// The school admin sees none.
export async function listStars(pool: Queryable, options: ListStarsOptions): Promise<StarList> {
  const { user } = options;
  const params: unknown[] = [user.schoolId];
  const conditions = ['st.school_id = $1'];
  const add = (condition: (placeholder: string) => string, value: unknown) => {
    params.push(value);
    conditions.push(condition(`$${params.length}`));
  };

  if (user.role === 'teacher') {
    add((p) => `s.teacher_id = ${p}`, user.id);
    if (options.studentId) {
      add((p) => `st.student_id = ${p}`, options.studentId);
    }
  } else if (user.role === 'student' || user.role === 'parent') {
    add((p) => `st.student_id = ${p}`, await resolveChild(pool, user, options.studentId));
  } else {
    throw new HttpError(403, 'forbidden', 'You are not allowed to do this.');
  }
  if (options.subjectId) {
    add((p) => `st.subject_id = ${p}`, options.subjectId);
  }
  const where = conditions.join(' AND ');

  const { rows: counted } = await pool.query<{ source: Star['source']; total: string }>(
    `SELECT st.source, count(*) AS total ${FROM} WHERE ${where} GROUP BY st.source`,
    params,
  );
  const { rows } = await pool.query<StarRow>(
    `SELECT st.id, st.source, st.student_id, u.full_name AS student_name,
            st.subject_id, s.name AS subject_name, st.lesson_id, l.title AS lesson_title,
            st.message, st.given_by, g.full_name AS given_by_name, st.created_at
     ${FROM} WHERE ${where}
     ORDER BY st.created_at DESC, st.id
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, options.limit, options.offset],
  );

  const count = (source: Star['source']) =>
    Number(counted.find((row) => row.source === source)?.total ?? 0);
  return {
    stars: rows.map(toStar),
    counts: { automatic: count('automatic'), teacher: count('teacher') },
  };
}

// A teacher gives a star to a student of one of their subjects, with a short message. The
// subject and the student not matching looks the same as not existing.
export async function giveStar(
  pool: Queryable,
  {
    user,
    studentId,
    subjectId,
    message,
  }: { user: AuthUser; studentId: string; subjectId: string; message: string },
): Promise<Star> {
  const { rows: allowed } = await pool.query(
    `SELECT 1 FROM subjects s
     JOIN enrollments e ON e.subject_id = s.id AND e.student_id = $3 AND e.status = 'approved'
     WHERE s.id = $2 AND s.school_id = $1 AND s.teacher_id = $4`,
    [user.schoolId, subjectId, studentId, user.id],
  );
  if (allowed.length === 0) {
    throw new HttpError(404, 'not_found', 'That student is not in your subject.');
  }

  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO stars (school_id, student_id, subject_id, source, given_by, given_by_role, message)
     VALUES ($1, $2, $3, 'teacher', $4, 'teacher', $5) RETURNING id`,
    [user.schoolId, studentId, subjectId, user.id, message],
  );
  const { rows: created } = await pool.query<StarRow>(
    `SELECT st.id, st.source, st.student_id, u.full_name AS student_name,
            st.subject_id, s.name AS subject_name, st.lesson_id, l.title AS lesson_title,
            st.message, st.given_by, g.full_name AS given_by_name, st.created_at
     ${FROM} WHERE st.id = $1`,
    [rows[0].id],
  );
  return toStar(created[0]);
}

// A teacher takes back a star they gave. Automatic stars cannot be taken back.
export async function deleteStar(
  pool: Queryable,
  { user, starId }: { user: AuthUser; starId: string },
): Promise<void> {
  const { rows } = await pool.query(
    `DELETE FROM stars
     WHERE id = $1 AND school_id = $2 AND source = 'teacher' AND given_by = $3
     RETURNING id`,
    [starId, user.schoolId, user.id],
  );
  if (rows.length === 0) {
    throw new HttpError(404, 'not_found', 'Star not found.');
  }
}

// The automatic star for finishing a lesson. A lesson gives one star only, so asking twice is
// harmless.
export async function awardLessonStar(
  db: Queryable,
  fields: { schoolId: string; studentId: string; subjectId: string; lessonId: string },
): Promise<void> {
  await db.query(
    `INSERT INTO stars (school_id, student_id, subject_id, source, lesson_id)
     VALUES ($1, $2, $3, 'automatic', $4)
     ON CONFLICT (student_id, lesson_id) WHERE source = 'automatic' DO NOTHING`,
    [fields.schoolId, fields.studentId, fields.subjectId, fields.lessonId],
  );
}

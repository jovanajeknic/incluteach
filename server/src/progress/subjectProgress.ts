import type { AuthUser } from '../auth/sessions.ts';
import type { Queryable } from '../db/pool.ts';
import { resolveChild } from '../enrollments/enrollments.ts';
import { HttpError } from '../http/errors.ts';

interface StarCounts {
  automatic: number;
  teacher: number;
}

export interface SubjectProgress {
  student: { id: string; fullName: string };
  subject: { id: string; name: string };
  // Lessons of the subject that are published, and how many of them the student finished.
  lessons: { published: number; completed: number };
  stars: StarCounts;
  // Every published lesson of the subject, newest first, so a screen can show which are done.
  items: { id: string; title: string; completed: boolean; completedAt: string | null }[];
}

export interface StudentRow {
  // 1 is the student who got the furthest. Students who are equal share a rank.
  rank: number;
  student: { id: string; fullName: string };
  completedLessons: number;
  stars: StarCounts;
}

export interface SubjectTable {
  subject: { id: string; name: string };
  publishedLessons: number;
  students: StudentRow[];
}

const notFound = () => new HttpError(404, 'not_found', 'Subject not found.');

interface SubjectInfo {
  id: string;
  name: string;
}

// The subject, if this person may see its progress:
// - a student, if they joined it (a parent, if their child did);
// - a teacher, if they teach it.
async function requireSubject(
  pool: Queryable,
  { user, subjectId, studentId }: { user: AuthUser; subjectId: string; studentId?: string },
  options: { forStudent: boolean },
): Promise<SubjectInfo & { studentId: string; studentName: string }> {
  const params: unknown[] = [user.schoolId, subjectId];
  let child: string | undefined;
  let access: string;

  if (user.role === 'teacher') {
    params.push(user.id);
    access = `s.teacher_id = $${params.length}`;
    if (options.forStudent) {
      if (!studentId) {
        throw new HttpError(400, 'invalid_student', 'Choose a student.');
      }
      child = studentId;
    }
  } else if (user.role === 'student' || user.role === 'parent') {
    child = await resolveChild(pool, user, studentId);
    access = 'TRUE';
  } else {
    throw new HttpError(403, 'forbidden', 'You are not allowed to do this.');
  }

  let studentJoin = '';
  if (child) {
    params.push(child);
    studentJoin = `JOIN enrollments e ON e.subject_id = s.id AND e.student_id = $${params.length}
        AND e.status = 'approved'
      JOIN users u ON u.id = e.student_id AND u.role = 'student'`;
  }
  const { rows } = await pool.query<{ id: string; name: string; student_name: string | null }>(
    `SELECT s.id, s.name, ${child ? 'u.full_name' : 'NULL'} AS student_name
     FROM subjects s ${studentJoin}
     WHERE s.school_id = $1 AND s.id = $2 AND ${access}`,
    params,
  );
  if (!rows[0]) {
    throw notFound();
  }
  return {
    id: rows[0].id,
    name: rows[0].name,
    studentId: child ?? '',
    studentName: rows[0].student_name ?? '',
  };
}

// How far one student got in one subject: finished lessons out of the published ones, and
// the stars. Seen by the student, by their parents, and by the teacher of the subject.
export async function getSubjectProgress(
  pool: Queryable,
  options: { user: AuthUser; subjectId: string; studentId?: string },
): Promise<SubjectProgress> {
  const subject = await requireSubject(pool, options, { forStudent: true });

  const { rows: items } = await pool.query<{
    id: string;
    title: string;
    completed_at: Date | null;
  }>(
    `SELECT l.id, l.title, c.completed_at
     FROM lessons l
     LEFT JOIN lesson_completions c ON c.lesson_id = l.id AND c.student_id = $2
     WHERE l.subject_id = $1 AND l.status = 'published'
     ORDER BY coalesce(l.published_at, l.updated_at) DESC, l.id`,
    [subject.id, subject.studentId],
  );
  const { rows: stars } = await pool.query<{ source: 'automatic' | 'teacher'; total: string }>(
    `SELECT source, count(*) AS total FROM stars
     WHERE student_id = $1 AND subject_id = $2 GROUP BY source`,
    [subject.studentId, subject.id],
  );
  const starCount = (source: 'automatic' | 'teacher') =>
    Number(stars.find((row) => row.source === source)?.total ?? 0);

  return {
    student: { id: subject.studentId, fullName: subject.studentName },
    subject: { id: subject.id, name: subject.name },
    lessons: {
      published: items.length,
      completed: items.filter((item) => item.completed_at).length,
    },
    stars: { automatic: starCount('automatic'), teacher: starCount('teacher') },
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      completed: item.completed_at !== null,
      completedAt: item.completed_at?.toISOString() ?? null,
    })),
  };
}

// The table for the teacher: every student who joined the subject, the one who got the
// furthest first. Students are compared by finished lessons, then by stars, then by name.
// Only the teacher of the subject sees it, and only the teacher sees a ranking.
export async function getSubjectTable(
  pool: Queryable,
  { user, subjectId }: { user: AuthUser; subjectId: string },
): Promise<SubjectTable> {
  const subject = await requireSubject(pool, { user, subjectId }, { forStudent: false });

  const { rows: lessons } = await pool.query<{ total: string }>(
    "SELECT count(*) AS total FROM lessons WHERE subject_id = $1 AND status = 'published'",
    [subject.id],
  );
  const { rows } = await pool.query<{
    id: string;
    full_name: string;
    completed: string;
    automatic: string;
    teacher: string;
  }>(
    `SELECT u.id, u.full_name,
       (SELECT count(*) FROM lesson_completions c JOIN lessons l ON l.id = c.lesson_id
         WHERE c.student_id = u.id AND l.subject_id = $1 AND l.status = 'published') AS completed,
       (SELECT count(*) FROM stars st WHERE st.student_id = u.id AND st.subject_id = $1
         AND st.source = 'automatic') AS automatic,
       (SELECT count(*) FROM stars st WHERE st.student_id = u.id AND st.subject_id = $1
         AND st.source = 'teacher') AS teacher
     FROM enrollments e
     JOIN users u ON u.id = e.student_id AND u.role = 'student'
     WHERE e.subject_id = $1 AND e.status = 'approved'
       AND u.deactivated_at IS NULL AND u.deleted_at IS NULL
     ORDER BY completed DESC, (
       (SELECT count(*) FROM stars st WHERE st.student_id = u.id AND st.subject_id = $1)
     ) DESC, u.full_name, u.id`,
    [subject.id],
  );

  let rank = 0;
  let previous = '';
  const students = rows.map((row, index): StudentRow => {
    const stars = { automatic: Number(row.automatic), teacher: Number(row.teacher) };
    const standing = `${row.completed}:${stars.automatic + stars.teacher}`;
    if (standing !== previous) {
      rank = index + 1;
      previous = standing;
    }
    return {
      rank,
      student: { id: row.id, fullName: row.full_name },
      completedLessons: Number(row.completed),
      stars,
    };
  });

  return {
    subject: { id: subject.id, name: subject.name },
    publishedLessons: Number(lessons[0].total),
    students,
  };
}

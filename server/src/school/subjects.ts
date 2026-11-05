import { isUniqueViolation } from '../db/errors.ts';
import type { Queryable } from '../db/pool.ts';
import { HttpError } from '../http/errors.ts';

export interface Subject {
  id: string;
  name: string;
  classId: string;
  className: string;
  schoolYear: number;
  teacher: {
    id: string;
    fullName: string;
    // True when the teacher left the school; the subject needs a new teacher.
    deactivated: boolean;
    // True when the teacher's data was erased; fullName is then only a placeholder.
    deleted: boolean;
  };
  createdAt: string;
}

interface SubjectRow {
  id: string;
  name: string;
  class_id: string;
  class_name: string;
  school_year: number;
  teacher_id: string;
  teacher_name: string;
  teacher_deactivated: boolean;
  teacher_deleted: boolean;
  created_at: Date;
}

const SELECT = `SELECT s.id, s.name, s.class_id, c.name AS class_name, c.school_year,
    s.teacher_id, u.full_name AS teacher_name,
    u.deactivated_at IS NOT NULL AS teacher_deactivated,
    u.deleted_at IS NOT NULL AS teacher_deleted, s.created_at
  FROM subjects s
  JOIN classes c ON c.id = s.class_id
  JOIN users u ON u.id = s.teacher_id`;

function toSubject(row: SubjectRow): Subject {
  return {
    id: row.id,
    name: row.name,
    classId: row.class_id,
    className: row.class_name,
    schoolYear: row.school_year,
    teacher: {
      id: row.teacher_id,
      fullName: row.teacher_name,
      deactivated: row.teacher_deactivated,
      deleted: row.teacher_deleted,
    },
    createdAt: row.created_at.toISOString(),
  };
}

const subjectExists = () =>
  new HttpError(409, 'subject_exists', 'This teacher already teaches this subject in this class.');
const subjectNotFound = () => new HttpError(404, 'not_found', 'Subject not found.');

export async function findSubject(
  pool: Queryable,
  { schoolId, subjectId }: { schoolId: string; subjectId: string },
): Promise<Subject | null> {
  const { rows } = await pool.query<SubjectRow>(`${SELECT} WHERE s.id = $1 AND s.school_id = $2`, [
    subjectId,
    schoolId,
  ]);
  return rows[0] ? toSubject(rows[0]) : null;
}

export interface ListSubjectsOptions {
  schoolId: string;
  classId?: string;
  teacherId?: string;
  schoolYear?: number;
  limit: number;
  offset: number;
}

// Newest school year first, then by class, subject and teacher.
export async function listSubjects(
  pool: Queryable,
  options: ListSubjectsOptions,
): Promise<{ subjects: Subject[]; total: number }> {
  const conditions = ['s.school_id = $1'];
  const params: unknown[] = [options.schoolId];
  const add = (condition: string, value: unknown) => {
    params.push(value);
    conditions.push(condition.replace('?', `$${params.length}`));
  };

  if (options.classId) add('s.class_id = ?', options.classId);
  if (options.teacherId) add('s.teacher_id = ?', options.teacherId);
  if (options.schoolYear !== undefined) add('c.school_year = ?', options.schoolYear);
  const where = conditions.join(' AND ');

  const { rows: counted } = await pool.query<{ total: string }>(
    `SELECT count(*) AS total FROM subjects s JOIN classes c ON c.id = s.class_id WHERE ${where}`,
    params,
  );
  const { rows } = await pool.query<SubjectRow>(
    `${SELECT} WHERE ${where}
     ORDER BY c.school_year DESC, lower(c.name), lower(s.name), u.full_name, s.id
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, options.limit, options.offset],
  );

  return { subjects: rows.map(toSubject), total: Number(counted[0].total) };
}

export type LessonStatusCounts = Record<'draft' | 'processing' | 'in_review' | 'published', number>;

// A subject as its own teacher sees it: no teacher block, but how many students joined and
// how many lessons there are in each state.
export interface TeacherSubject {
  id: string;
  name: string;
  classId: string;
  className: string;
  schoolYear: number;
  studentCount: number;
  lessonCounts: LessonStatusCounts;
}

interface TeacherSubjectRow {
  id: string;
  name: string;
  class_id: string;
  class_name: string;
  school_year: number;
  student_count: string;
  draft_count: string;
  processing_count: string;
  in_review_count: string;
  published_count: string;
}

// The subjects one teacher teaches in one school year, by class and then by name. Students who
// left the school (deactivated or erased) are not counted.
export async function listTeacherSubjects(
  pool: Queryable,
  { schoolId, teacherId, schoolYear }: { schoolId: string; teacherId: string; schoolYear: number },
): Promise<TeacherSubject[]> {
  const { rows } = await pool.query<TeacherSubjectRow>(
    `SELECT s.id, s.name, s.class_id, c.name AS class_name, c.school_year,
       (SELECT count(*) FROM enrollments e
          JOIN users st ON st.id = e.student_id
         WHERE e.subject_id = s.id AND e.status = 'approved'
           AND st.deactivated_at IS NULL AND st.deleted_at IS NULL) AS student_count,
       (SELECT count(*) FROM lessons l WHERE l.subject_id = s.id AND l.status = 'draft')
         AS draft_count,
       (SELECT count(*) FROM lessons l WHERE l.subject_id = s.id AND l.status = 'processing')
         AS processing_count,
       (SELECT count(*) FROM lessons l WHERE l.subject_id = s.id AND l.status = 'in_review')
         AS in_review_count,
       (SELECT count(*) FROM lessons l WHERE l.subject_id = s.id AND l.status = 'published')
         AS published_count
     FROM subjects s
     JOIN classes c ON c.id = s.class_id
     WHERE s.school_id = $1 AND s.teacher_id = $2 AND c.school_year = $3
     ORDER BY lower(c.name), lower(s.name), s.id`,
    [schoolId, teacherId, schoolYear],
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    classId: row.class_id,
    className: row.class_name,
    schoolYear: row.school_year,
    studentCount: Number(row.student_count),
    lessonCounts: {
      draft: Number(row.draft_count),
      processing: Number(row.processing_count),
      in_review: Number(row.in_review_count),
      published: Number(row.published_count),
    },
  }));
}

// A subject needs a teacher who still works at this school.
async function assertActiveTeacher(
  pool: Queryable,
  { schoolId, teacherId }: { schoolId: string; teacherId: string },
): Promise<void> {
  const { rows } = await pool.query(
    `SELECT 1 FROM users WHERE id = $1 AND school_id = $2 AND role = 'teacher'
       AND deactivated_at IS NULL AND deleted_at IS NULL`,
    [teacherId, schoolId],
  );
  if (rows.length === 0) {
    throw new HttpError(400, 'invalid_teacher', 'Choose an active teacher of this school.');
  }
}

export async function createSubject(
  pool: Queryable,
  {
    schoolId,
    name,
    classId,
    teacherId,
  }: { schoolId: string; name: string; classId: string; teacherId: string },
): Promise<Subject> {
  const { rows: classRows } = await pool.query(
    'SELECT 1 FROM classes WHERE id = $1 AND school_id = $2',
    [classId, schoolId],
  );
  if (classRows.length === 0) {
    throw new HttpError(400, 'invalid_class', 'Choose a class of this school.');
  }
  await assertActiveTeacher(pool, { schoolId, teacherId });

  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO subjects (school_id, class_id, teacher_id, name) VALUES ($1, $2, $3, $4)
     ON CONFLICT (class_id, lower(name), teacher_id) DO NOTHING
     RETURNING id`,
    [schoolId, classId, teacherId, name],
  );
  if (!rows[0]) {
    throw subjectExists();
  }
  return (await findSubject(pool, { schoolId, subjectId: rows[0].id })) as Subject;
}

// Changes the name, the teacher, or both. Decisions already made on enrollment requests stay
// as they were; requests that are still waiting now go to the new teacher.
export async function updateSubject(
  pool: Queryable,
  {
    schoolId,
    subjectId,
    name,
    teacherId,
  }: { schoolId: string; subjectId: string; name?: string; teacherId?: string },
): Promise<Subject> {
  const current = await findSubject(pool, { schoolId, subjectId });
  if (!current) {
    throw subjectNotFound();
  }

  const newName = name ?? current.name;
  const newTeacherId = teacherId ?? current.teacher.id;
  if (teacherId !== undefined && teacherId !== current.teacher.id) {
    await assertActiveTeacher(pool, { schoolId, teacherId });
  }

  const { rows: clash } = await pool.query(
    `SELECT 1 FROM subjects WHERE class_id = $1 AND lower(name) = lower($2)
       AND teacher_id = $3 AND id <> $4`,
    [current.classId, newName, newTeacherId, subjectId],
  );
  if (clash.length > 0) {
    throw subjectExists();
  }

  try {
    await pool.query(
      `UPDATE subjects SET name = $3, teacher_id = $4, updated_at = now()
       WHERE id = $1 AND school_id = $2`,
      [subjectId, schoolId, newName, newTeacherId],
    );
  } catch (error) {
    // Someone added the same subject between the check and the change.
    throw isUniqueViolation(error) ? subjectExists() : error;
  }
  return (await findSubject(pool, { schoolId, subjectId })) as Subject;
}

// A subject that has enrollment requests or lessons is part of students' history and cannot
// be deleted.
export async function deleteSubject(
  pool: Queryable,
  { schoolId, subjectId }: { schoolId: string; subjectId: string },
): Promise<void> {
  const { rows } = await pool.query(
    `DELETE FROM subjects s WHERE s.id = $1 AND s.school_id = $2
       AND NOT EXISTS (SELECT 1 FROM enrollments e WHERE e.subject_id = s.id)
       AND NOT EXISTS (SELECT 1 FROM lessons l WHERE l.subject_id = s.id)
     RETURNING s.id`,
    [subjectId, schoolId],
  );
  if (rows.length > 0) {
    return;
  }

  if (!(await findSubject(pool, { schoolId, subjectId }))) {
    throw subjectNotFound();
  }

  const { rows: lessons } = await pool.query(
    'SELECT 1 FROM lessons WHERE subject_id = $1 LIMIT 1',
    [subjectId],
  );
  throw lessons.length > 0
    ? new HttpError(
        409,
        'subject_has_lessons',
        'This subject has lessons, so it cannot be deleted.',
      )
    : new HttpError(
        409,
        'subject_has_enrollments',
        'Students have requested or joined this subject, so it cannot be deleted.',
      );
}

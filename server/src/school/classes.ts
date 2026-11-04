import { isUniqueViolation } from '../db/errors.ts';
import type { Queryable } from '../db/pool.ts';
import { HttpError } from '../http/errors.ts';

export interface SchoolClass {
  id: string;
  name: string;
  // The year the school year starts in: 2026 means 2026/27.
  schoolYear: number;
  subjectCount: number;
  createdAt: string;
}

interface ClassRow {
  id: string;
  name: string;
  school_year: number;
  subject_count: number;
  created_at: Date;
}

const SELECT = `SELECT c.id, c.name, c.school_year, c.created_at,
    (SELECT count(*) FROM subjects s WHERE s.class_id = c.id)::int AS subject_count
  FROM classes c`;

function toSchoolClass(row: ClassRow): SchoolClass {
  return {
    id: row.id,
    name: row.name,
    schoolYear: row.school_year,
    subjectCount: row.subject_count,
    createdAt: row.created_at.toISOString(),
  };
}

const classExists = () =>
  new HttpError(409, 'class_exists', 'A class with this name already exists in that school year.');
const classNotFound = () => new HttpError(404, 'not_found', 'Class not found.');

async function findClass(
  pool: Queryable,
  { schoolId, classId }: { schoolId: string; classId: string },
): Promise<SchoolClass | null> {
  const { rows } = await pool.query<ClassRow>(`${SELECT} WHERE c.id = $1 AND c.school_id = $2`, [
    classId,
    schoolId,
  ]);
  return rows[0] ? toSchoolClass(rows[0]) : null;
}

// Newest school year first, then by name.
export async function listClasses(
  pool: Queryable,
  { schoolId, schoolYear }: { schoolId: string; schoolYear?: number },
): Promise<SchoolClass[]> {
  const params: unknown[] = [schoolId];
  let where = 'c.school_id = $1';
  if (schoolYear !== undefined) {
    params.push(schoolYear);
    where += ' AND c.school_year = $2';
  }

  const { rows } = await pool.query<ClassRow>(
    `${SELECT} WHERE ${where} ORDER BY c.school_year DESC, lower(c.name), c.id`,
    params,
  );
  return rows.map(toSchoolClass);
}

export async function createClass(
  pool: Queryable,
  { schoolId, name, schoolYear }: { schoolId: string; name: string; schoolYear: number },
): Promise<SchoolClass> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO classes (school_id, name, school_year) VALUES ($1, $2, $3)
     ON CONFLICT (school_id, school_year, lower(name)) DO NOTHING
     RETURNING id`,
    [schoolId, name, schoolYear],
  );
  if (!rows[0]) {
    throw classExists();
  }
  return (await findClass(pool, { schoolId, classId: rows[0].id })) as SchoolClass;
}

export async function renameClass(
  pool: Queryable,
  { schoolId, classId, name }: { schoolId: string; classId: string; name: string },
): Promise<SchoolClass> {
  const current = await findClass(pool, { schoolId, classId });
  if (!current) {
    throw classNotFound();
  }

  const { rows: clash } = await pool.query(
    `SELECT 1 FROM classes WHERE school_id = $1 AND school_year = $2
       AND lower(name) = lower($3) AND id <> $4`,
    [schoolId, current.schoolYear, name, classId],
  );
  if (clash.length > 0) {
    throw classExists();
  }

  try {
    await pool.query(
      'UPDATE classes SET name = $3, updated_at = now() WHERE id = $1 AND school_id = $2',
      [classId, schoolId, name],
    );
  } catch (error) {
    // Someone created a class with this name between the check and the change.
    throw isUniqueViolation(error) ? classExists() : error;
  }
  return (await findClass(pool, { schoolId, classId })) as SchoolClass;
}

// Only a class without subjects can be deleted, so no subject is lost by accident.
export async function deleteClass(
  pool: Queryable,
  { schoolId, classId }: { schoolId: string; classId: string },
): Promise<void> {
  const { rows } = await pool.query(
    `DELETE FROM classes c WHERE c.id = $1 AND c.school_id = $2
       AND NOT EXISTS (SELECT 1 FROM subjects s WHERE s.class_id = c.id)
     RETURNING c.id`,
    [classId, schoolId],
  );
  if (rows.length > 0) {
    return;
  }

  const stillThere = await findClass(pool, { schoolId, classId });
  throw stillThere
    ? new HttpError(409, 'class_not_empty', 'Remove or move the subjects of this class first.')
    : classNotFound();
}

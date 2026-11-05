import type { Queryable } from '../db/pool.ts';
import { HttpError } from '../http/errors.ts';

interface Person {
  id: string;
  fullName: string;
  username: string;
  // True when the person left the school.
  deactivated: boolean;
  // True when the person's data was erased; fullName is then only a placeholder.
  deleted: boolean;
}

export interface ParentLink {
  parent: Person;
  student: Person;
  createdAt: string;
}

interface LinkRow {
  created_at: Date;
  parent_id: string;
  parent_name: string;
  parent_username: string;
  parent_deactivated: boolean;
  parent_deleted: boolean;
  student_id: string;
  student_name: string;
  student_username: string;
  student_deactivated: boolean;
  student_deleted: boolean;
}

const SELECT = `SELECT ps.created_at,
    p.id AS parent_id, p.full_name AS parent_name, p.username AS parent_username,
    p.deactivated_at IS NOT NULL AS parent_deactivated, p.deleted_at IS NOT NULL AS parent_deleted,
    s.id AS student_id, s.full_name AS student_name, s.username AS student_username,
    s.deactivated_at IS NOT NULL AS student_deactivated, s.deleted_at IS NOT NULL AS student_deleted
  FROM parent_students ps
  JOIN users p ON p.id = ps.parent_id
  JOIN users s ON s.id = ps.student_id`;

function toParentLink(row: LinkRow): ParentLink {
  return {
    parent: {
      id: row.parent_id,
      fullName: row.parent_name,
      username: row.parent_username,
      deactivated: row.parent_deactivated,
      deleted: row.parent_deleted,
    },
    student: {
      id: row.student_id,
      fullName: row.student_name,
      username: row.student_username,
      deactivated: row.student_deactivated,
      deleted: row.student_deleted,
    },
    createdAt: row.created_at.toISOString(),
  };
}

export interface ListParentLinksOptions {
  schoolId: string;
  parentId?: string;
  studentId?: string;
  limit: number;
  offset: number;
}

// Links of one school, optionally only those of one parent or one student.
export async function listParentLinks(
  pool: Queryable,
  options: ListParentLinksOptions,
): Promise<{ links: ParentLink[]; total: number }> {
  const conditions = ['ps.school_id = $1'];
  const params: unknown[] = [options.schoolId];
  const add = (condition: string, value: unknown) => {
    params.push(value);
    conditions.push(condition.replace('?', `$${params.length}`));
  };

  if (options.parentId) add('ps.parent_id = ?', options.parentId);
  if (options.studentId) add('ps.student_id = ?', options.studentId);
  const where = conditions.join(' AND ');

  const { rows: counted } = await pool.query<{ total: string }>(
    `SELECT count(*) AS total FROM parent_students ps WHERE ${where}`,
    params,
  );
  const { rows } = await pool.query<LinkRow>(
    `${SELECT} WHERE ${where}
     ORDER BY s.full_name, p.full_name, ps.student_id, ps.parent_id
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, options.limit, options.offset],
  );

  return { links: rows.map(toParentLink), total: Number(counted[0].total) };
}

async function assertActiveUser(
  pool: Queryable,
  { schoolId, userId, role }: { schoolId: string; userId: string; role: 'parent' | 'student' },
): Promise<void> {
  const { rows } = await pool.query(
    `SELECT 1 FROM users WHERE id = $1 AND school_id = $2 AND role = $3
       AND deactivated_at IS NULL AND deleted_at IS NULL`,
    [userId, schoolId, role],
  );
  if (rows.length === 0) {
    throw new HttpError(
      400,
      role === 'parent' ? 'invalid_parent' : 'invalid_student',
      `Choose an active ${role} of this school.`,
    );
  }
}

// A parent can have several children and a child several parents. Only an admin of the
// school links them, so a parent can never claim somebody else's child. Links are not removed
// one by one; they go away only when a person's data is erased for good.
export async function createParentLink(
  pool: Queryable,
  {
    schoolId,
    adminId,
    parentId,
    studentId,
  }: { schoolId: string; adminId: string; parentId: string; studentId: string },
): Promise<ParentLink> {
  await assertActiveUser(pool, { schoolId, userId: parentId, role: 'parent' });
  await assertActiveUser(pool, { schoolId, userId: studentId, role: 'student' });

  const { rows } = await pool.query(
    `INSERT INTO parent_students (parent_id, student_id, school_id, created_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (parent_id, student_id) DO NOTHING
     RETURNING parent_id`,
    [parentId, studentId, schoolId, adminId],
  );
  if (rows.length === 0) {
    throw new HttpError(409, 'link_exists', 'This parent is already linked to this student.');
  }

  const { links } = await listParentLinks(pool, {
    schoolId,
    parentId,
    studentId,
    limit: 1,
    offset: 0,
  });
  return links[0];
}

export interface Child {
  id: string;
  fullName: string;
}

// The children linked to one parent who are still at the school (not deactivated, not erased),
// by name. Only the name: it is all a parent needs to choose a child.
export async function listChildren(
  pool: Queryable,
  { schoolId, parentId }: { schoolId: string; parentId: string },
): Promise<Child[]> {
  const { rows } = await pool.query<{ id: string; full_name: string }>(
    `SELECT s.id, s.full_name
     FROM parent_students ps
     JOIN users s ON s.id = ps.student_id
     WHERE ps.school_id = $1 AND ps.parent_id = $2
       AND s.deactivated_at IS NULL AND s.deleted_at IS NULL
     ORDER BY s.full_name, s.id`,
    [schoolId, parentId],
  );
  return rows.map((row) => ({ id: row.id, fullName: row.full_name }));
}

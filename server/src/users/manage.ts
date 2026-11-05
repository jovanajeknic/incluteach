import type { Queryable } from '../db/pool.ts';
import { inTransaction } from '../db/transaction.ts';
import type { UserRole } from '../roles.ts';

// What an admin sees about a user. It never includes the password hash.
export interface ManagedUser {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: UserRole;
  // True once the person has chosen a password with their activation link.
  activated: boolean;
  deactivatedAt: string | null;
  createdAt: string;
}

interface ManagedUserRow {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  activated: boolean;
  deactivated_at: Date | null;
  created_at: Date;
}

const COLUMNS = `id, username, full_name, email, role,
  password_hash IS NOT NULL AS activated, deactivated_at, created_at`;

function toManagedUser(row: ManagedUserRow): ManagedUser {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    activated: row.activated,
    deactivatedAt: row.deactivated_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  };
}

export type UserStatus = 'active' | 'deactivated' | 'all';

export interface ListUsersOptions {
  schoolId: string;
  role?: UserRole;
  status: UserStatus;
  // Matches part of the name or username, ignoring letter case.
  search?: string;
  limit: number;
  offset: number;
}

// Users of one school. Users whose data was deleted for good are never listed.
export async function listUsers(
  pool: Queryable,
  options: ListUsersOptions,
): Promise<{ users: ManagedUser[]; total: number }> {
  const conditions = ['school_id = $1', 'deleted_at IS NULL'];
  const params: unknown[] = [options.schoolId];

  if (options.role) {
    params.push(options.role);
    conditions.push(`role = $${params.length}`);
  }
  if (options.status === 'active') {
    conditions.push('deactivated_at IS NULL');
  } else if (options.status === 'deactivated') {
    conditions.push('deactivated_at IS NOT NULL');
  }
  if (options.search) {
    params.push(options.search);
    // position() instead of LIKE, so "%" and "_" in the search are just characters.
    conditions.push(
      `position(lower($${params.length}) in lower(full_name || ' ' || username)) > 0`,
    );
  }
  const where = conditions.join(' AND ');

  const { rows: counted } = await pool.query<{ total: string }>(
    `SELECT count(*) AS total FROM users WHERE ${where}`,
    params,
  );
  const { rows } = await pool.query<ManagedUserRow>(
    `SELECT ${COLUMNS} FROM users WHERE ${where}
     ORDER BY full_name, id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, options.limit, options.offset],
  );

  return { users: rows.map(toManagedUser), total: Number(counted[0].total) };
}

export async function findManagedUser(
  pool: Queryable,
  { schoolId, userId }: { schoolId: string; userId: string },
): Promise<ManagedUser | null> {
  const { rows } = await pool.query<ManagedUserRow>(
    `SELECT ${COLUMNS} FROM users WHERE id = $1 AND school_id = $2 AND deleted_at IS NULL`,
    [userId, schoolId],
  );
  return rows[0] ? toManagedUser(rows[0]) : null;
}

// Fixes the name. The username stays the same, so nobody has to learn it again.
export async function renameUser(
  pool: Queryable,
  { schoolId, userId, fullName }: { schoolId: string; userId: string; fullName: string },
): Promise<ManagedUser | null> {
  const { rows } = await pool.query<ManagedUserRow>(
    `UPDATE users SET full_name = $3, updated_at = now()
     WHERE id = $1 AND school_id = $2 AND deleted_at IS NULL
     RETURNING ${COLUMNS}`,
    [userId, schoolId, fullName],
  );
  return rows[0] ? toManagedUser(rows[0]) : null;
}

// The three actions below work on many users at once (for example a whole class at the end of
// the school year). Each returns the ids it really changed; ids from another school, unknown
// ids and users in the wrong state are skipped.

// The person can no longer sign in and their sessions end. Everything else stays.
export async function deactivateUsers(
  pool: Queryable,
  { schoolId, ids }: { schoolId: string; ids: string[] },
): Promise<string[]> {
  return inTransaction(pool, async (db) => {
    const { rows } = await db.query<{ id: string }>(
      `UPDATE users SET deactivated_at = now(), updated_at = now()
       WHERE id = ANY($1::uuid[]) AND school_id = $2
         AND deactivated_at IS NULL AND deleted_at IS NULL
       RETURNING id`,
      [ids, schoolId],
    );
    const changed = rows.map((row) => row.id);
    await db.query('DELETE FROM sessions WHERE user_id = ANY($1::uuid[])', [changed]);
    return changed;
  });
}

export async function reactivateUsers(
  pool: Queryable,
  { schoolId, ids }: { schoolId: string; ids: string[] },
): Promise<string[]> {
  const { rows } = await pool.query<{ id: string }>(
    `UPDATE users SET deactivated_at = NULL, updated_at = now()
     WHERE id = ANY($1::uuid[]) AND school_id = $2
       AND deactivated_at IS NOT NULL AND deleted_at IS NULL
     RETURNING id`,
    [ids, schoolId],
  );
  return rows.map((row) => row.id);
}

// Erases the personal data for good: name, username, email and password are replaced or
// removed, and sessions and activation links are deleted. Only deactivated users can be
// deleted. The row stays as an anonymous shell, because other records may point at it:
// a parent's confirmation of an enrollment, or the teacher of a subject.
export async function deleteUsers(
  pool: Queryable,
  { schoolId, ids }: { schoolId: string; ids: string[] },
): Promise<string[]> {
  return inTransaction(pool, async (db) => {
    const { rows } = await db.query<{ id: string }>(
      `UPDATE users SET
         full_name = 'Deleted user',
         username = 'deleted_' || substr(replace(id::text, '-', ''), 1, 12),
         email = NULL,
         password_hash = NULL,
         deleted_at = now(),
         updated_at = now()
       WHERE id = ANY($1::uuid[]) AND school_id = $2
         AND deactivated_at IS NOT NULL AND deleted_at IS NULL
       RETURNING id`,
      [ids, schoolId],
    );
    const deleted = rows.map((row) => row.id);

    await db.query('DELETE FROM sessions WHERE user_id = ANY($1::uuid[])', [deleted]);
    await db.query('DELETE FROM activation_tokens WHERE user_id = ANY($1::uuid[])', [deleted]);
    // A deleted student's quiz tries, answers, finished lessons and stars are their own data too.
    await db.query('DELETE FROM quiz_attempts WHERE student_id = ANY($1::uuid[])', [deleted]);
    await db.query('DELETE FROM lesson_completions WHERE student_id = ANY($1::uuid[])', [deleted]);
    await db.query('DELETE FROM stars WHERE student_id = ANY($1::uuid[])', [deleted]);
    // The conversations about a deleted student, and what a deleted parent or teacher wrote.
    await db.query(
      'DELETE FROM conversation_messages WHERE student_id = ANY($1::uuid[]) OR author_id = ANY($1::uuid[])',
      [deleted],
    );
    // A deleted student's own requests go with them.
    await db.query('DELETE FROM enrollments WHERE student_id = ANY($1::uuid[])', [deleted]);
    // Links to a parent or student are removed too, except a link that a remaining
    // enrollment still depends on (the parent who confirmed it). Such a link holds only ids.
    await db.query(
      `DELETE FROM parent_students ps
       WHERE (ps.parent_id = ANY($1::uuid[]) OR ps.student_id = ANY($1::uuid[]))
         AND NOT EXISTS (
           SELECT 1 FROM enrollments e
           WHERE e.student_id = ps.student_id AND e.parent_decided_by = ps.parent_id
         )`,
      [deleted],
    );

    return deleted;
  });
}

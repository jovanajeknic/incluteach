import { toAuthUser, type AuthUser, type UserRow } from '../auth/sessions.ts';
import type { Queryable } from '../db/pool.ts';
import { HttpError } from '../http/errors.ts';
import type { UserRole } from '../roles.ts';
import { pickUsername, usernameBase } from './username.ts';

// Tries again when two accounts with the same name are created at the same moment.
const MAX_ATTEMPTS = 5;

// Creates an account that cannot be used yet: it has no password or email until the
// person opens their activation link. The username is generated from the name.
export async function createUser(
  pool: Queryable,
  { schoolId, role, fullName }: { schoolId: string; role: UserRole; fullName: string },
): Promise<AuthUser> {
  const base = usernameBase(fullName);
  if (!base) {
    throw new HttpError(400, 'invalid_full_name', 'The name must contain letters.');
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    // Usernames are unique across all schools, so every school is searched.
    const { rows: taken } = await pool.query<{ username: string }>(
      'SELECT username FROM users WHERE starts_with(username, $1)',
      [base],
    );
    const username = pickUsername(base, new Set(taken.map((row) => row.username)));

    const { rows } = await pool.query<UserRow>(
      `INSERT INTO users (full_name, role, school_id, username)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (username) DO NOTHING
       RETURNING id, username, full_name, email, role, school_id`,
      [fullName, role, schoolId, username],
    );
    if (rows[0]) {
      return toAuthUser(rows[0]);
    }
  }

  throw new HttpError(409, 'username_conflict', 'Could not create a username. Try again.');
}

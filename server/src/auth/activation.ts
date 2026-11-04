import { randomBytes } from 'node:crypto';

import type { Queryable } from '../db/pool.ts';
import { hashToken, type UserRow } from './sessions.ts';

export const ACTIVATION_LIFETIME_DAYS = 7;

export interface IssuedActivation {
  // The plain token exists only here; the database keeps a hash of it.
  token: string;
  expiresAt: Date;
}

export async function issueActivationToken(
  pool: Queryable,
  { userId, schoolId, adminId }: { userId: string; schoolId: string; adminId: string },
): Promise<IssuedActivation> {
  // A user has at most one live link, so issuing a new one cancels the old one.
  await pool.query(
    `UPDATE activation_tokens SET revoked_at = now()
     WHERE user_id = $1 AND used_at IS NULL AND revoked_at IS NULL`,
    [userId],
  );

  const token = randomBytes(32).toString('base64url');
  const { rows } = await pool.query<{ expires_at: Date }>(
    `INSERT INTO activation_tokens (user_id, school_id, created_by, token_hash, expires_at)
     VALUES ($1, $2, $3, $4, now() + make_interval(days => $5))
     RETURNING expires_at`,
    [userId, schoolId, adminId, hashToken(token), ACTIVATION_LIFETIME_DAYS],
  );
  return { token, expiresAt: rows[0].expires_at };
}

// The user a link belongs to, if the link can still be used.
export async function findUserOfLiveToken(pool: Queryable, token: string): Promise<string | null> {
  const { rows } = await pool.query<{ user_id: string }>(
    `SELECT user_id FROM activation_tokens
     WHERE token_hash = $1 AND used_at IS NULL AND revoked_at IS NULL AND expires_at > now()`,
    [hashToken(token)],
  );
  return rows[0]?.user_id ?? null;
}

export async function isEmailTakenByAnother(
  pool: Queryable,
  email: string,
  userId: string,
): Promise<boolean> {
  const { rows } = await pool.query(
    'SELECT 1 FROM users WHERE lower(email) = lower($1) AND id <> $2',
    [email, userId],
  );
  return rows.length > 0;
}

// Uses up the link and sets the password and email in one statement, so either both happen
// or neither does (a failed email never wastes the link). Returns null if the link was used,
// cancelled or expired in the meantime.
export async function activateAccount(
  pool: Queryable,
  { token, passwordHash, email }: { token: string; passwordHash: string; email: string },
): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(
    `WITH claimed AS (
       UPDATE activation_tokens SET used_at = now()
       WHERE token_hash = $1 AND used_at IS NULL AND revoked_at IS NULL AND expires_at > now()
       RETURNING user_id
     )
     UPDATE users SET password_hash = $2, email = $3, updated_at = now()
     FROM claimed WHERE users.id = claimed.user_id
     RETURNING users.id, users.username, users.full_name, users.email, users.role, users.school_id`,
    [hashToken(token), passwordHash, email],
  );
  const user = rows[0];
  if (!user) {
    return null;
  }

  // A new password ends every older session, for example after the admin issued a link
  // because the password was forgotten or someone else knew it.
  await pool.query('DELETE FROM sessions WHERE user_id = $1', [user.id]);
  return user;
}

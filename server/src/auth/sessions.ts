import { createHash, randomBytes } from 'node:crypto';

import type { Response } from 'express';

import type { Queryable } from '../db/pool.ts';
import type { UserRole } from '../roles.ts';

export const SESSION_COOKIE = 'session';
export const SESSION_LIFETIME_DAYS = 7;
export const SESSION_LIFETIME_MS = SESSION_LIFETIME_DAYS * 24 * 60 * 60 * 1000;

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: UserRole;
  schoolId: string;
}

export interface UserRow {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  school_id: string;
}

export function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    schoolId: row.school_id,
  };
}

// Only this hash is stored. A leaked database then holds no cookie value that still works.
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(pool: Queryable, userId: string): Promise<string> {
  // Old, expired sessions of this user are cleaned up whenever they sign in again.
  await pool.query('DELETE FROM sessions WHERE user_id = $1 AND expires_at <= now()', [userId]);

  const token = randomBytes(32).toString('base64url');
  await pool.query(
    `INSERT INTO sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + make_interval(days => $3))`,
    [userId, hashToken(token), SESSION_LIFETIME_DAYS],
  );
  return token;
}

export async function findSessionUser(pool: Queryable, token: string): Promise<AuthUser | null> {
  const { rows } = await pool.query<UserRow>(
    `SELECT u.id, u.username, u.full_name, u.email, u.role, u.school_id
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)],
  );
  return rows[0] ? toAuthUser(rows[0]) : null;
}

export async function deleteSession(pool: Queryable, token: string): Promise<void> {
  await pool.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
}

// The cookie is unreachable from page scripts (httpOnly) and not sent along with requests
// made by other websites (SameSite=Lax). Secure keeps it off plain HTTP in production.
export function setSessionCookie(res: Response, token: string, secure: boolean): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: SESSION_LIFETIME_MS,
  });
}

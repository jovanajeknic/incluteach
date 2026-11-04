import type { RequestHandler } from 'express';

import type { Queryable } from '../db/pool.ts';
import { HttpError } from '../http/errors.ts';
import type { UserRole } from '../roles.ts';
import { findSessionUser, SESSION_COOKIE, type AuthUser } from './sessions.ts';

declare module 'express-serve-static-core' {
  interface Request {
    // Set by authenticate() when the request carries a valid session cookie.
    user?: AuthUser;
  }
}

// Reads one cookie from the Cookie header; the server needs no cookie parser for this.
export function readCookie(header: string | undefined, name: string): string | undefined {
  for (const part of header?.split(';') ?? []) {
    const separator = part.indexOf('=');
    if (separator !== -1 && part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }
  return undefined;
}

// Looks up the signed-in user, if any. It never rejects a request by itself:
// use requireAuth or requireRole on the routes that need a signed-in user.
export function authenticate(pool: Queryable): RequestHandler {
  return async (req, _res, next) => {
    try {
      const token = readCookie(req.headers.cookie, SESSION_COOKIE);
      if (token) {
        req.user = (await findSessionUser(pool, token)) ?? undefined;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  next(req.user ? undefined : new HttpError(401, 'unauthenticated', 'You are not signed in.'));
};

// Access control lives here on the backend; hiding a page in the frontend is not security.
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(new HttpError(401, 'unauthenticated', 'You are not signed in.'));
    } else if (!roles.includes(req.user.role)) {
      next(new HttpError(403, 'forbidden', 'You are not allowed to do this.'));
    } else {
      next();
    }
  };
}

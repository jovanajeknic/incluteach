import { randomUUID } from 'node:crypto';

import { Router, type Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

import { activateAccount, findUserOfLiveToken, isEmailTakenByAnother } from '../auth/activation.ts';
import { readCookie, requireAuth } from '../auth/currentUser.ts';
import { isValidEmail, MAX_EMAIL_LENGTH } from '../auth/email.ts';
import {
  checkPassword,
  hashPassword,
  MAX_PASSWORD_LENGTH,
  verifyPassword,
} from '../auth/password.ts';
import {
  createSession,
  deleteSession,
  SESSION_COOKIE,
  setSessionCookie,
  toAuthUser,
  type UserRow,
} from '../auth/sessions.ts';
import type { Queryable } from '../db/pool.ts';
import { HttpError, type ApiError } from '../http/errors.ts';

const MAX_IDENTIFIER_LENGTH = MAX_EMAIL_LENGTH;

// 10 wrong attempts in 15 minutes for one account from one address. Counting the address
// together with the account keeps a whole class behind one school network from locking
// each other out, and stops a stranger from locking somebody else's account.
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 10;
// A looser limit per address alone, against someone trying many different accounts.
const MAX_FAILED_ATTEMPTS_PER_ADDRESS = 100;
// Activation links are long random values that cannot be guessed, so this only keeps
// someone from making the server do password hashing over and over.
const MAX_FAILED_ACTIVATIONS_PER_ADDRESS = 30;

export interface AuthRouterOptions {
  secureCookies: boolean;
}

interface LoginRow extends UserRow {
  password_hash: string | null;
}

// Verifying against this when the account is unknown or not activated makes those
// requests take as long as real ones, so response time does not reveal which accounts exist.
let decoyHash: Promise<string> | undefined;

function getDecoyHash(): Promise<string> {
  decoyHash ??= hashPassword(randomUUID());
  return decoyHash;
}

function readLoginBody(req: Request): { identifier: string; password: string } {
  const { identifier, password } = (req.body ?? {}) as Record<string, unknown>;

  if (
    typeof identifier !== 'string' ||
    typeof password !== 'string' ||
    !identifier.trim() ||
    identifier.length > MAX_IDENTIFIER_LENGTH
  ) {
    throw new HttpError(400, 'invalid_request', 'Enter your email or username and your password.');
  }
  return { identifier: identifier.trim(), password };
}

const UNIQUE_VIOLATION = '23505';

function readActivationBody(req: Request): { token: string; password: string; email: string } {
  const { token, password, email } = (req.body ?? {}) as Record<string, unknown>;

  if (typeof token !== 'string' || typeof password !== 'string' || typeof email !== 'string') {
    throw new HttpError(400, 'invalid_request', 'The link, the password and the email are needed.');
  }

  const trimmedEmail = email.trim();
  if (!isValidEmail(trimmedEmail)) {
    throw new HttpError(400, 'invalid_email', 'Enter a valid email address.');
  }

  const problem = checkPassword(password);
  if (problem) {
    throw new HttpError(400, `password_${problem}`, 'The password is not allowed.');
  }
  return { token, password, email: trimmedEmail };
}

function invalidActivationLink(): HttpError {
  return new HttpError(
    400,
    'invalid_activation_link',
    'This link is not valid any more. Ask your school admin for a new one.',
  );
}

function emailTaken(): HttpError {
  return new HttpError(409, 'email_taken', 'This email is already used by another account.');
}

function tooManyAttempts(): ApiError {
  return {
    error: {
      code: 'too_many_attempts',
      message: 'Too many failed attempts. Try again in a few minutes.',
    },
  };
}

function limitFailedAttempts(max: number, keyFor: (req: Request) => string) {
  return rateLimit({
    windowMs: ATTEMPT_WINDOW_MS,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Only failed requests count, so a correct password never uses up the allowance.
    skipSuccessfulRequests: true,
    keyGenerator: keyFor,
    handler: (_req, res) => {
      res.status(429).json(tooManyAttempts());
    },
  });
}

export function authRouter(pool: Queryable, { secureCookies }: AuthRouterOptions): Router {
  const router = Router();

  const addressKey = (req: Request) => ipKeyGenerator(req.ip ?? '');
  const accountKey = (req: Request) => {
    const identifier = (req.body as { identifier?: unknown } | undefined)?.identifier;
    const account = typeof identifier === 'string' ? identifier.trim().toLowerCase() : '';
    return `${addressKey(req)}|${account}`;
  };

  router.post(
    '/login',
    limitFailedAttempts(MAX_FAILED_ATTEMPTS_PER_ADDRESS, addressKey),
    limitFailedAttempts(MAX_FAILED_ATTEMPTS, accountKey),
    async (req, res) => {
      const { identifier, password } = readLoginBody(req);

      // An email contains "@" and a username never does, so the two are told apart safely.
      const column = identifier.includes('@') ? 'email' : 'username';
      const { rows } = await pool.query<LoginRow>(
        `SELECT id, username, full_name, email, role, school_id, password_hash
         FROM users WHERE lower(${column}) = lower($1)`,
        [identifier],
      );
      const user = rows[0];

      const tooLong = password.length > MAX_PASSWORD_LENGTH;
      const passwordCorrect = await verifyPassword(
        tooLong ? '' : password,
        user?.password_hash ?? (await getDecoyHash()),
      );

      // Unknown account, not activated yet and wrong password all look the same.
      if (!user || !user.password_hash || tooLong || !passwordCorrect) {
        throw new HttpError(
          401,
          'invalid_credentials',
          'The email, username or password is not correct.',
        );
      }

      setSessionCookie(res, await createSession(pool, user.id), secureCookies);
      res.set('Cache-Control', 'no-store');
      res.json({ user: toAuthUser(user) });
    },
  );

  router.post(
    '/activate',
    limitFailedAttempts(MAX_FAILED_ACTIVATIONS_PER_ADDRESS, addressKey),
    async (req, res) => {
      const { token, password, email } = readActivationBody(req);

      const userId = await findUserOfLiveToken(pool, token);
      if (!userId) {
        throw invalidActivationLink();
      }
      if (await isEmailTakenByAnother(pool, email, userId)) {
        throw emailTaken();
      }

      let user: UserRow | null;
      try {
        user = await activateAccount(pool, {
          token,
          passwordHash: await hashPassword(password),
          email,
        });
      } catch (error) {
        // Someone took the email between the check above and now.
        if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
          throw emailTaken();
        }
        throw error;
      }
      if (!user) {
        throw invalidActivationLink();
      }

      setSessionCookie(res, await createSession(pool, user.id), secureCookies);
      res.set('Cache-Control', 'no-store');
      res.json({ user: toAuthUser(user) });
    },
  );

  router.post('/logout', async (req, res) => {
    const token = readCookie(req.headers.cookie, SESSION_COOKIE);
    if (token) {
      await deleteSession(pool, token);
    }
    res.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      sameSite: 'lax',
      secure: secureCookies,
      path: '/',
    });
    res.status(204).end();
  });

  router.get('/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  return router;
}

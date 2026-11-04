import type { RequestHandler } from 'express';

import { HttpError } from './errors.ts';

function hasNul(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.includes('\u0000');
  }
  if (Array.isArray(value)) {
    return value.some(hasNul);
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).some(([key, inner]) => key.includes('\u0000') || hasNul(inner));
  }
  return false;
}

// PostgreSQL cannot store the character with code 0 in text and fails with a server error
// (500). No real text contains it, so a request that does is refused with a clear 400 before
// it can reach the database. Checks the body and the query string.
export const rejectNul: RequestHandler = (req, _res, next) => {
  if (hasNul(req.body) || hasNul(req.query)) {
    next(
      new HttpError(
        400,
        'invalid_request',
        'The request contains a character that is not allowed.',
      ),
    );
    return;
  }
  next();
};

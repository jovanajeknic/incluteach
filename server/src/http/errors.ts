import type { ErrorRequestHandler, RequestHandler } from 'express';

// Every error response has this shape, so the frontend (and its API mocks) can rely on it:
// { "error": { "code": "not_found", "message": "..." } }
// A few errors carry more facts a screen can use, in "details": for example when the next
// attempt at a quiz is allowed.
export interface ApiError {
  error: { code: string; message: string; details?: Record<string, unknown> };
}

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function body(code: string, message: string, details?: Record<string, unknown>): ApiError {
  return { error: { code, message, ...(details ? { details } : {}) } };
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json(body('not_found', 'Resource not found.'));
};

// The 4 parameters are required: Express recognises an error handler by its arity.
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json(body(error.code, error.message, error.details));
    return;
  }

  // Errors raised by Express' own body parsing carry a 4xx status, for example
  // malformed JSON (400) or a body that is too large (413).
  const status = (error as { status?: unknown }).status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    res.status(status).json(body('bad_request', 'The request could not be read.'));
    return;
  }

  // Details go to the log only; the client never sees internals such as SQL errors.
  console.error('Unexpected error:', error);
  res.status(500).json(body('internal_error', 'Something went wrong. Please try again later.'));
};

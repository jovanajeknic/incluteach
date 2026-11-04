import type { RequestHandler } from 'express';

// One line per request: method, path, status and how long it took, for example
//   POST /auth/login 401 112ms
// The query string is left out (it can contain names that were searched for) and so are
// the body and the cookies, so the log never holds a password, a token or personal data.
export function requestLog(write: (line: string) => void = console.log): RequestHandler {
  return (req, res, next) => {
    const started = process.hrtime.bigint();

    res.on('finish', () => {
      const milliseconds = Math.round(Number(process.hrtime.bigint() - started) / 1e6);
      const path = req.originalUrl.split('?')[0];
      write(`${req.method} ${path} ${res.statusCode} ${milliseconds}ms`);
    });

    next();
  };
}

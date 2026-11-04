import express from 'express';

import { authenticate } from './auth/currentUser.ts';
import type { ScryptCost } from './auth/password.ts';
import type { Queryable } from './db/pool.ts';
import { errorHandler, notFoundHandler } from './http/errors.ts';
import { requestLog } from './http/requestLog.ts';
import { authRouter } from './routes/auth.ts';
import { classesRouter } from './routes/classes.ts';
import { catalogRouter, enrollmentsRouter } from './routes/enrollments.ts';
import { healthRouter } from './routes/health.ts';
import { parentLinksRouter } from './routes/parentLinks.ts';
import { subjectsRouter } from './routes/subjects.ts';
import { usersRouter } from './routes/users.ts';

export interface AppDependencies {
  pool: Queryable;
  secureCookies?: boolean;
  // Address of the website that activation links point to.
  publicUrl?: string;
  // Only tests set this, to make password hashing quicker.
  passwordCost?: ScryptCost;
  // Writes one line per request (method, path, status, time). Off by default; the server turns it on.
  logRequests?: boolean;
}

// Builds the Express app without starting it, so tests can call it directly.
export function createApp({
  pool,
  secureCookies = false,
  publicUrl = 'http://localhost:5173',
  passwordCost,
  logRequests = false,
}: AppDependencies): express.Express {
  const app = express();

  // Do not tell the world which framework runs the server.
  app.disable('x-powered-by');
  if (logRequests) {
    app.use(requestLog());
  }
  app.use(express.json({ limit: '100kb' }));
  app.use(authenticate(pool));

  app.use(healthRouter(pool));
  app.use('/auth', authRouter(pool, { secureCookies, passwordCost }));
  app.use('/users', usersRouter(pool, { publicUrl }));
  app.use('/classes', classesRouter(pool));
  app.use('/subjects', subjectsRouter(pool));
  app.use('/parent-students', parentLinksRouter(pool));
  app.use('/catalog', catalogRouter(pool));
  app.use('/enrollments', enrollmentsRouter(pool));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

import express from 'express';

import { authenticate } from './auth/currentUser.ts';
import type { ScryptCost } from './auth/password.ts';
import type { Queryable } from './db/pool.ts';
import { errorHandler, notFoundHandler } from './http/errors.ts';
import { authRouter } from './routes/auth.ts';
import { classesRouter } from './routes/classes.ts';
import { healthRouter } from './routes/health.ts';
import { subjectsRouter } from './routes/subjects.ts';
import { usersRouter } from './routes/users.ts';

export interface AppDependencies {
  pool: Queryable;
  secureCookies?: boolean;
  // Address of the website that activation links point to.
  publicUrl?: string;
  // Only tests set this, to make password hashing quicker.
  passwordCost?: ScryptCost;
}

// Builds the Express app without starting it, so tests can call it directly.
export function createApp({
  pool,
  secureCookies = false,
  publicUrl = 'http://localhost:5173',
  passwordCost,
}: AppDependencies): express.Express {
  const app = express();

  // Do not tell the world which framework runs the server.
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(authenticate(pool));

  app.use(healthRouter(pool));
  app.use('/auth', authRouter(pool, { secureCookies, passwordCost }));
  app.use('/users', usersRouter(pool, { publicUrl }));
  app.use('/classes', classesRouter(pool));
  app.use('/subjects', subjectsRouter(pool));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

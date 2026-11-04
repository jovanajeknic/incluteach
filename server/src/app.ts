import express from 'express';

import { authenticate } from './auth/currentUser.ts';
import type { Queryable } from './db/pool.ts';
import { errorHandler, notFoundHandler } from './http/errors.ts';
import { authRouter } from './routes/auth.ts';
import { healthRouter } from './routes/health.ts';

export interface AppDependencies {
  pool: Queryable;
  secureCookies?: boolean;
}

// Builds the Express app without starting it, so tests can call it directly.
export function createApp({ pool, secureCookies = false }: AppDependencies): express.Express {
  const app = express();

  // Do not tell the world which framework runs the server.
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(authenticate(pool));

  app.use(healthRouter(pool));
  app.use('/auth', authRouter(pool, { secureCookies }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

import express from 'express';
import type pg from 'pg';

import { errorHandler, notFoundHandler } from './http/errors.ts';
import { healthRouter } from './routes/health.ts';

export interface AppDependencies {
  pool: Pick<pg.Pool, 'query'>;
}

// Builds the Express app without starting it, so tests can call it directly.
export function createApp({ pool }: AppDependencies): express.Express {
  const app = express();

  // Do not tell the world which framework runs the server.
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.use(healthRouter(pool));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

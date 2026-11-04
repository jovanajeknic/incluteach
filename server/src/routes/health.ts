import { Router } from 'express';

import type { Queryable } from '../db/pool.ts';

// Reports whether the server is running and can reach the database.
export function healthRouter(pool: Queryable): Router {
  const router = Router();

  router.get('/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok' });
    } catch (error) {
      console.error('Health check failed:', (error as Error).message);
      res.status(503).json({ status: 'unavailable' });
    }
  });

  return router;
}

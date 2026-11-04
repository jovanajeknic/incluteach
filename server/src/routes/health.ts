import { Router } from 'express';

import type { Queryable } from '../db/pool.ts';

// Reports whether the server is running and can reach the database, and which AI service is
// set up. "fake" means the AI makes invented test results, so a screen can say that clearly.
export function healthRouter(pool: Queryable, { ai }: { ai: string }): Router {
  const router = Router();

  router.get('/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', ai });
    } catch (error) {
      console.error('Health check failed:', (error as Error).message);
      res.status(503).json({ status: 'unavailable' });
    }
  });

  return router;
}

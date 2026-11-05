import { Router } from 'express';

import { getUser, requireRole } from '../auth/currentUser.ts';
import type { Queryable } from '../db/pool.ts';
import { listChildren } from '../school/parentLinks.ts';

// The children of the signed-in parent. A parent needs this to say which child a request or a
// question is about (`studentId` of the other endpoints); the admin's list of all links is
// `GET /parent-students`.
export function childrenRouter(pool: Queryable): Router {
  const router = Router();
  router.use(requireRole('parent'));

  router.get('/', async (req, res) => {
    const user = getUser(req);
    res.json({
      children: await listChildren(pool, { schoolId: user.schoolId, parentId: user.id }),
    });
  });

  return router;
}

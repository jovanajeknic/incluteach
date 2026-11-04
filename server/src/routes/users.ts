import { Router } from 'express';

import { issueActivationToken } from '../auth/activation.ts';
import { getUser, requireRole } from '../auth/currentUser.ts';
import type { Queryable } from '../db/pool.ts';
import { HttpError } from '../http/errors.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface UsersRouterOptions {
  publicUrl: string;
}

export function usersRouter(pool: Queryable, { publicUrl }: UsersRouterOptions): Router {
  const router = Router();

  // Issues the link (and QR) that lets a user set their password. It also serves as
  // "forgot my password": a new link cancels the previous one.
  router.post('/:id/activation', requireRole('admin'), async (req, res) => {
    const admin = getUser(req);
    const userId = String(req.params.id);

    // A user of another school looks exactly like a user that does not exist.
    const notFound = new HttpError(404, 'not_found', 'User not found.');
    if (!UUID.test(userId)) {
      throw notFound;
    }
    const { rows } = await pool.query('SELECT 1 FROM users WHERE id = $1 AND school_id = $2', [
      userId,
      admin.schoolId,
    ]);
    if (rows.length === 0) {
      throw notFound;
    }

    const { token, expiresAt } = await issueActivationToken(pool, {
      userId,
      schoolId: admin.schoolId,
      adminId: admin.id,
    });

    // The link is shown once; afterwards only a hash of it exists, so keep it out of caches.
    res.set('Cache-Control', 'no-store');
    res.status(201).json({
      activation: {
        url: `${publicUrl}/activate?token=${token}`,
        expiresAt: expiresAt.toISOString(),
      },
    });
  });

  return router;
}

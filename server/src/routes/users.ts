import { Router } from 'express';

import { activationUrl, issueActivationToken } from '../auth/activation.ts';
import { getUser, requireRole } from '../auth/currentUser.ts';
import type { Queryable } from '../db/pool.ts';
import { HttpError } from '../http/errors.ts';
import { isUserRole, type UserRole } from '../roles.ts';
import { createUser } from '../users/createUser.ts';

// An admin creates teachers, students and parents. Further admins are not created here.
const CREATABLE_ROLES: readonly UserRole[] = ['teacher', 'student', 'parent'];
const MAX_FULL_NAME_LENGTH = 100;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface UsersRouterOptions {
  publicUrl: string;
}

export function usersRouter(pool: Queryable, { publicUrl }: UsersRouterOptions): Router {
  const router = Router();

  // Creates an account in the admin's school. The person cannot sign in until they open
  // their activation link (see below).
  router.post('/', requireRole('admin'), async (req, res) => {
    const admin = getUser(req);
    const { fullName, role } = (req.body ?? {}) as Record<string, unknown>;

    // Spaces are tidied here so "  Ana   Ivić " and "Ana Ivić" are the same name.
    const cleanName = typeof fullName === 'string' ? fullName.trim().replace(/\s+/g, ' ') : '';
    if (cleanName.length < 2 || cleanName.length > MAX_FULL_NAME_LENGTH) {
      throw new HttpError(400, 'invalid_full_name', 'Enter the full name (2 to 100 characters).');
    }
    if (!isUserRole(role) || !CREATABLE_ROLES.includes(role)) {
      throw new HttpError(400, 'invalid_role', 'The role must be teacher, student or parent.');
    }

    const user = await createUser(pool, { schoolId: admin.schoolId, role, fullName: cleanName });
    res.status(201).json({ user });
  });

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
        url: activationUrl(publicUrl, token),
        expiresAt: expiresAt.toISOString(),
      },
    });
  });

  return router;
}

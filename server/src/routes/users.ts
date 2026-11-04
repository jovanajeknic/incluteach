import { Router } from 'express';

import { activationUrl, issueActivationToken } from '../auth/activation.ts';
import { getUser, requireRole } from '../auth/currentUser.ts';
import type { Queryable } from '../db/pool.ts';
import { HttpError } from '../http/errors.ts';
import { isUserRole, type UserRole } from '../roles.ts';
import { createUser } from '../users/createUser.ts';
import {
  deactivateUsers,
  deleteUsers,
  findManagedUser,
  listUsers,
  reactivateUsers,
  renameUser,
  type UserStatus,
} from '../users/manage.ts';

// An admin creates teachers, students and parents. Further admins are not created here.
const CREATABLE_ROLES: readonly UserRole[] = ['teacher', 'student', 'parent'];
const MAX_FULL_NAME_LENGTH = 100;
const MAX_SEARCH_LENGTH = 100;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
// One request can change at most this many users, for example a whole class.
const MAX_IDS = 200;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES: readonly UserStatus[] = ['active', 'deactivated', 'all'];

export interface UsersRouterOptions {
  publicUrl: string;
}

// Spaces are tidied so "  Ana   Ivić " and "Ana Ivić" are the same name.
function readFullName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (name.length < 2 || name.length > MAX_FULL_NAME_LENGTH) {
    throw new HttpError(400, 'invalid_full_name', 'Enter the full name (2 to 100 characters).');
  }
  return name;
}

function readIds(body: unknown, selfId: string): string[] {
  const { ids } = (body ?? {}) as { ids?: unknown };

  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > MAX_IDS ||
    !ids.every((id) => typeof id === 'string' && UUID.test(id))
  ) {
    throw new HttpError(400, 'invalid_request', `Send "ids": a list of 1 to ${MAX_IDS} user ids.`);
  }

  const unique = [...new Set((ids as string[]).map((id) => id.toLowerCase()))];
  if (unique.includes(selfId.toLowerCase())) {
    // Stops an admin from locking themselves (and possibly the whole school) out.
    throw new HttpError(400, 'cannot_change_self', 'You cannot do this to your own account.');
  }
  return unique;
}

function readWholeNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (value === undefined) {
    return fallback;
  }
  const number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new HttpError(400, 'invalid_request', 'The page settings are not valid.');
  }
  return number;
}

export function usersRouter(pool: Queryable, { publicUrl }: UsersRouterOptions): Router {
  const router = Router();

  // The users of the admin's school. Query: role, status (active by default, deactivated or
  // all), search (part of the name or username), limit and offset.
  router.get('/', requireRole('admin'), async (req, res) => {
    const admin = getUser(req);
    const { role, status = 'active', search } = req.query;

    if (role !== undefined && !isUserRole(role)) {
      throw new HttpError(400, 'invalid_request', 'Unknown role.');
    }
    if (typeof status !== 'string' || !STATUSES.includes(status as UserStatus)) {
      throw new HttpError(400, 'invalid_request', 'The status must be active, deactivated or all.');
    }
    if (search !== undefined && (typeof search !== 'string' || search.length > MAX_SEARCH_LENGTH)) {
      throw new HttpError(400, 'invalid_request', 'The search text is not valid.');
    }

    const limit = readWholeNumber(req.query.limit, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
    const offset = readWholeNumber(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER);

    res.json(
      await listUsers(pool, {
        schoolId: admin.schoolId,
        role,
        status: status as UserStatus,
        search: search?.trim() || undefined,
        limit,
        offset,
      }),
    );
  });

  // Creates an account in the admin's school. The person cannot sign in until they open
  // their activation link (see below).
  router.post('/', requireRole('admin'), async (req, res) => {
    const admin = getUser(req);
    const { fullName, role } = (req.body ?? {}) as Record<string, unknown>;

    const cleanName = readFullName(fullName);
    if (!isUserRole(role) || !CREATABLE_ROLES.includes(role)) {
      throw new HttpError(400, 'invalid_role', 'The role must be teacher, student or parent.');
    }

    const created = await createUser(pool, {
      schoolId: admin.schoolId,
      role,
      fullName: cleanName,
    });
    const user = await findManagedUser(pool, { schoolId: admin.schoolId, userId: created.id });
    res.status(201).json({ user });
  });

  // Fixes a name. The username does not change.
  router.patch('/:id', requireRole('admin'), async (req, res) => {
    const admin = getUser(req);
    const userId = String(req.params.id);
    const fullName = readFullName((req.body as { fullName?: unknown } | undefined)?.fullName);

    const user = UUID.test(userId)
      ? await renameUser(pool, { schoolId: admin.schoolId, userId, fullName })
      : null;
    if (!user) {
      throw new HttpError(404, 'not_found', 'User not found.');
    }
    res.json({ user });
  });

  // Deactivate, reactivate and delete take a list of ids and answer with the ids that were
  // changed (affectedIds) and the ones that were left alone (skippedIds): another school's
  // users, unknown ids, or users that were already in the requested state.
  const bulkAction = (
    path: string,
    action: (pool: Queryable, input: { schoolId: string; ids: string[] }) => Promise<string[]>,
  ) => {
    router.post(path, requireRole('admin'), async (req, res) => {
      const admin = getUser(req);
      const ids = readIds(req.body, admin.id);

      const affectedIds = await action(pool, { schoolId: admin.schoolId, ids });
      const affected = new Set(affectedIds);
      res.json({ affectedIds, skippedIds: ids.filter((id) => !affected.has(id)) });
    });
  };

  // The person can no longer sign in, but everything is kept and it can be undone.
  // Meant for students who finished school.
  bulkAction('/deactivate', deactivateUsers);
  bulkAction('/reactivate', reactivateUsers);
  // Erases personal data for good. Only for deactivated users. Meant for accounts created by
  // mistake.
  bulkAction('/delete', deleteUsers);

  // Issues the link (and QR) that lets a user set their password. It also serves as
  // "forgot my password": a new link cancels the previous one.
  router.post('/:id/activation', requireRole('admin'), async (req, res) => {
    const admin = getUser(req);
    const userId = String(req.params.id);

    // A user of another school looks exactly like a user that does not exist.
    const user = UUID.test(userId)
      ? await findManagedUser(pool, { schoolId: admin.schoolId, userId })
      : null;
    if (!user) {
      throw new HttpError(404, 'not_found', 'User not found.');
    }
    if (user.deactivatedAt) {
      throw new HttpError(409, 'user_deactivated', 'Reactivate this user before issuing a link.');
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

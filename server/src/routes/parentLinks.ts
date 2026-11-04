import { Router } from 'express';

import { getUser, requireRole } from '../auth/currentUser.ts';
import type { Queryable } from '../db/pool.ts';
import { HttpError } from '../http/errors.ts';
import { isUuid, readWholeNumber } from '../http/validation.ts';
import { createParentLink, listParentLinks } from '../school/parentLinks.ts';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

// Which parent is responsible for which child. Only an admin of the school can see and make
// these links.
export function parentLinksRouter(pool: Queryable): Router {
  const router = Router();
  router.use(requireRole('admin'));

  // Query: studentId (the parents of one child), parentId (the children of one parent),
  // limit and offset.
  router.get('/', async (req, res) => {
    const { parentId, studentId } = req.query;
    if (parentId !== undefined && !isUuid(parentId)) {
      throw new HttpError(400, 'invalid_request', 'The parent id is not valid.');
    }
    if (studentId !== undefined && !isUuid(studentId)) {
      throw new HttpError(400, 'invalid_request', 'The student id is not valid.');
    }

    res.json(
      await listParentLinks(pool, {
        schoolId: getUser(req).schoolId,
        parentId,
        studentId,
        limit: readWholeNumber(req.query.limit, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE),
        offset: readWholeNumber(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER),
      }),
    );
  });

  router.post('/', async (req, res) => {
    const admin = getUser(req);
    const { parentId, studentId } = (req.body ?? {}) as Record<string, unknown>;
    if (!isUuid(parentId)) {
      throw new HttpError(400, 'invalid_parent', 'Choose an active parent of this school.');
    }
    if (!isUuid(studentId)) {
      throw new HttpError(400, 'invalid_student', 'Choose an active student of this school.');
    }

    const link = await createParentLink(pool, {
      schoolId: admin.schoolId,
      adminId: admin.id,
      parentId,
      studentId,
    });
    res.status(201).json({ link });
  });

  return router;
}

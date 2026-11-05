import { Router } from 'express';

import { getUser, requireRole } from '../auth/currentUser.ts';
import type { Queryable } from '../db/pool.ts';
import { HttpError } from '../http/errors.ts';
import { cleanText, isUuid, readWholeNumber } from '../http/validation.ts';
import { deleteStar, giveStar, listStars } from '../stars/stars.ts';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

function readOptionalUuid(value: unknown, what: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isUuid(value)) {
    throw new HttpError(400, 'invalid_request', `The ${what} is not valid.`);
  }
  return value;
}

// Stars for effort: automatic ones for finishing a lesson (see POST /lessons/{id}/complete)
// and ones a teacher gives with a short message.
export function starsRouter(pool: Queryable): Router {
  const router = Router();

  // Query: studentId (a parent names the child, a teacher may narrow to one student, a student
  // leaves it out), subjectId, limit, offset.
  router.get('/', requireRole('student', 'parent', 'teacher'), async (req, res) => {
    res.json(
      await listStars(pool, {
        user: getUser(req),
        studentId: readOptionalUuid(req.query.studentId, 'student id'),
        subjectId: readOptionalUuid(req.query.subjectId, 'subject id'),
        limit: readWholeNumber(req.query.limit, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE),
        offset: readWholeNumber(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER),
      }),
    );
  });

  // Body: { studentId, subjectId, message }. The message says why, 1 to 200 characters.
  router.post('/', requireRole('teacher'), async (req, res) => {
    const { studentId, subjectId, message } = (req.body ?? {}) as Record<string, unknown>;
    if (!isUuid(studentId)) {
      throw new HttpError(400, 'invalid_student', 'Choose a student.');
    }
    if (!isUuid(subjectId)) {
      throw new HttpError(400, 'invalid_subject', 'Choose a subject.');
    }
    const text = cleanText(message, 1, 200);
    if (text === null) {
      throw new HttpError(400, 'invalid_message', 'The message must be 1 to 200 characters.');
    }
    const star = await giveStar(pool, { user: getUser(req), studentId, subjectId, message: text });
    res.status(201).json({ star });
  });

  router.delete('/:id', requireRole('teacher'), async (req, res) => {
    if (!isUuid(req.params.id)) {
      throw new HttpError(404, 'not_found', 'Star not found.');
    }
    await deleteStar(pool, { user: getUser(req), starId: req.params.id });
    res.status(204).end();
  });

  return router;
}

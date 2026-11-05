import { Router } from 'express';

import { getUser, requireRole } from '../auth/currentUser.ts';
import type { Queryable } from '../db/pool.ts';
import { HttpError } from '../http/errors.ts';
import { isUuid } from '../http/validation.ts';
import { getSubjectProgress, getSubjectTable } from '../progress/subjectProgress.ts';

function readSubjectId(value: unknown): string {
  if (!isUuid(value)) {
    throw new HttpError(404, 'not_found', 'Subject not found.');
  }
  return value;
}

// The progress of students in a subject. It shares the path /subjects with the admin's
// router, so it must be mounted before it (that router lets only the admin through), and each
// route here names the roles it allows.
export function progressRouter(pool: Queryable): Router {
  const router = Router();

  // Query: studentId (a parent names the child, the teacher names the student, a student
  // leaves it out).
  router.get('/:id/progress', requireRole('student', 'parent', 'teacher'), async (req, res) => {
    const { studentId } = req.query;
    if (studentId !== undefined && !isUuid(studentId)) {
      throw new HttpError(400, 'invalid_request', 'The student id is not valid.');
    }
    res.json(
      await getSubjectProgress(pool, {
        user: getUser(req),
        subjectId: readSubjectId(req.params.id),
        studentId,
      }),
    );
  });

  // The table of all students of the subject, for its teacher.
  router.get('/:id/progress/students', requireRole('teacher'), async (req, res) => {
    res.json(
      await getSubjectTable(pool, {
        user: getUser(req),
        subjectId: readSubjectId(req.params.id),
      }),
    );
  });

  return router;
}

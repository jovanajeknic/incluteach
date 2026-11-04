import { Router } from 'express';

import { getUser, requireRole } from '../auth/currentUser.ts';
import type { Queryable } from '../db/pool.ts';
import {
  createEnrollment,
  decideEnrollment,
  listCatalogClasses,
  listEnrollments,
  resolveChild,
  searchCatalog,
  type Decision,
  type EnrollmentStatus,
} from '../enrollments/enrollments.ts';
import { HttpError } from '../http/errors.ts';
import { isUuid, readWholeNumber } from '../http/validation.ts';
import { currentSchoolYear } from '../school/schoolYear.ts';

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;
const MAX_SEARCH_LENGTH = 100;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const STATUSES: readonly EnrollmentStatus[] = [
  'awaiting_parent',
  'awaiting_teacher',
  'approved',
  'rejected',
];

function readOptionalUuid(value: unknown, what: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isUuid(value)) {
    throw new HttpError(400, 'invalid_request', `The ${what} is not valid.`);
  }
  return value;
}

// Where students and parents look for subjects to join. Only the subjects of their own
// school and of the current school year are offered (a different year can be asked for).
export function catalogRouter(pool: Queryable): Router {
  const router = Router();

  // Query: studentId (a parent says which child), classId, search, schoolYear, limit and offset.
  router.get('/subjects', requireRole('student', 'parent'), async (req, res) => {
    const user = getUser(req);
    const studentId = await resolveChild(
      pool,
      user,
      readOptionalUuid(req.query.studentId, 'student id'),
    );

    const { search, schoolYear } = req.query;
    if (search !== undefined && (typeof search !== 'string' || search.length > MAX_SEARCH_LENGTH)) {
      throw new HttpError(400, 'invalid_request', 'The search text is not valid.');
    }
    const year =
      schoolYear === undefined
        ? currentSchoolYear()
        : readWholeNumber(schoolYear, MIN_YEAR, MIN_YEAR, MAX_YEAR);

    const result = await searchCatalog(pool, {
      schoolId: user.schoolId,
      studentId,
      schoolYear: year,
      classId: readOptionalUuid(req.query.classId, 'class id'),
      search: search?.trim() || undefined,
      limit: readWholeNumber(req.query.limit, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE),
      offset: readWholeNumber(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER),
    });
    res.json({ ...result, schoolYear: year });
  });

  // The classes to choose from in the filter, for the current school year unless another is
  // asked for (query: schoolYear). Pass a class id to GET /catalog/subjects as classId.
  router.get('/classes', requireRole('student', 'parent'), async (req, res) => {
    const { schoolYear } = req.query;
    const year =
      schoolYear === undefined
        ? currentSchoolYear()
        : readWholeNumber(schoolYear, MIN_YEAR, MIN_YEAR, MAX_YEAR);

    res.json({
      classes: await listCatalogClasses(pool, {
        schoolId: getUser(req).schoolId,
        schoolYear: year,
      }),
      schoolYear: year,
    });
  });

  return router;
}

// Requests to join a subject: the student asks, a parent confirms, the teacher decides.
export function enrollmentsRouter(pool: Queryable): Router {
  const router = Router();

  // A student sends { subjectId }. A parent sends { subjectId, studentId } for their own child.
  router.post('/', requireRole('student', 'parent'), async (req, res) => {
    const user = getUser(req);
    const { subjectId, studentId } = (req.body ?? {}) as Record<string, unknown>;

    if (!isUuid(subjectId)) {
      throw new HttpError(400, 'invalid_subject', 'Choose a subject of this school.');
    }
    if (studentId !== undefined && !isUuid(studentId)) {
      throw new HttpError(400, 'invalid_student', 'Choose a student of this school.');
    }

    const child = await resolveChild(pool, user, studentId);
    const enrollment = await createEnrollment(pool, { user, subjectId, studentId: child });
    res.status(201).json({ enrollment });
  });

  // Query: status, subjectId, studentId (a parent narrows to one child), limit and offset.
  router.get('/', requireRole('student', 'parent', 'teacher'), async (req, res) => {
    const { status } = req.query;
    if (status !== undefined && !STATUSES.includes(status as EnrollmentStatus)) {
      throw new HttpError(400, 'invalid_request', 'Unknown status.');
    }

    res.json(
      await listEnrollments(pool, {
        user: getUser(req),
        status: status as EnrollmentStatus | undefined,
        subjectId: readOptionalUuid(req.query.subjectId, 'subject id'),
        studentId: readOptionalUuid(req.query.studentId, 'student id'),
        limit: readWholeNumber(req.query.limit, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE),
        offset: readWholeNumber(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER),
      }),
    );
  });

  // A parent or the teacher of the subject answers a request. A parent acts on a request that
  // waits for a parent (for one of their own children), a teacher on one the parent has passed
  // on. Answers 409 `wrong_state` when the request is no longer waiting for that person.
  const decide = (action: Decision) => {
    router.post(`/:id/${action}`, requireRole('parent', 'teacher'), async (req, res) => {
      const enrollmentId = req.params.id;
      if (!isUuid(enrollmentId)) {
        throw new HttpError(404, 'not_found', 'Request not found.');
      }

      const enrollment = await decideEnrollment(pool, {
        user: getUser(req),
        enrollmentId,
        decision: action,
      });
      res.json({ enrollment });
    });
  };
  decide('approve');
  decide('reject');

  return router;
}

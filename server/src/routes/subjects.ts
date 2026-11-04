import { Router } from 'express';

import { getUser, requireRole } from '../auth/currentUser.ts';
import type { Queryable } from '../db/pool.ts';
import { HttpError } from '../http/errors.ts';
import { cleanText, isUuid, readWholeNumber } from '../http/validation.ts';
import { createSubject, deleteSubject, listSubjects, updateSubject } from '../school/subjects.ts';

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;
const MAX_NAME_LENGTH = 100;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

function readSubjectName(value: unknown): string {
  const name = cleanText(value, 1, MAX_NAME_LENGTH);
  if (!name) {
    throw new HttpError(
      400,
      'invalid_subject_name',
      'Enter the subject name (1 to 100 characters).',
    );
  }
  return name;
}

// A subject that cannot belong to this school looks the same as one that does not exist.
function readSubjectId(value: unknown): string {
  if (!isUuid(value)) {
    throw new HttpError(404, 'not_found', 'Subject not found.');
  }
  return value;
}

// Subjects of the admin's school. A subject is a name in one class taught by one teacher; the
// same name can appear several times with different teachers or in different classes.
export function subjectsRouter(pool: Queryable): Router {
  const router = Router();
  router.use(requireRole('admin'));

  // Query: classId, teacherId, schoolYear, limit and offset.
  router.get('/', async (req, res) => {
    const { classId, teacherId, schoolYear } = req.query;
    if (classId !== undefined && !isUuid(classId)) {
      throw new HttpError(400, 'invalid_request', 'The class id is not valid.');
    }
    if (teacherId !== undefined && !isUuid(teacherId)) {
      throw new HttpError(400, 'invalid_request', 'The teacher id is not valid.');
    }

    res.json(
      await listSubjects(pool, {
        schoolId: getUser(req).schoolId,
        classId,
        teacherId,
        schoolYear:
          schoolYear === undefined
            ? undefined
            : readWholeNumber(schoolYear, MIN_YEAR, MIN_YEAR, MAX_YEAR),
        limit: readWholeNumber(req.query.limit, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE),
        offset: readWholeNumber(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER),
      }),
    );
  });

  router.post('/', async (req, res) => {
    const { name, classId, teacherId } = (req.body ?? {}) as Record<string, unknown>;
    const cleanName = readSubjectName(name);
    if (!isUuid(classId)) {
      throw new HttpError(400, 'invalid_class', 'Choose a class of this school.');
    }
    if (!isUuid(teacherId)) {
      throw new HttpError(400, 'invalid_teacher', 'Choose an active teacher of this school.');
    }

    const subject = await createSubject(pool, {
      schoolId: getUser(req).schoolId,
      name: cleanName,
      classId,
      teacherId,
    });
    res.status(201).json({ subject });
  });

  // Changes the name, the teacher, or both. The class cannot change.
  router.patch('/:id', async (req, res) => {
    const subjectId = readSubjectId(req.params.id);
    const { name, teacherId } = (req.body ?? {}) as Record<string, unknown>;
    if (name === undefined && teacherId === undefined) {
      throw new HttpError(400, 'invalid_request', 'Send a new name, a new teacher, or both.');
    }
    if (teacherId !== undefined && !isUuid(teacherId)) {
      throw new HttpError(400, 'invalid_teacher', 'Choose an active teacher of this school.');
    }

    const subject = await updateSubject(pool, {
      schoolId: getUser(req).schoolId,
      subjectId,
      name: name === undefined ? undefined : readSubjectName(name),
      teacherId,
    });
    res.json({ subject });
  });

  // Only a subject without any enrollment request can be deleted.
  router.delete('/:id', async (req, res) => {
    await deleteSubject(pool, {
      schoolId: getUser(req).schoolId,
      subjectId: readSubjectId(req.params.id),
    });
    res.status(204).end();
  });

  return router;
}

import { Router } from 'express';

import { getUser, requireRole } from '../auth/currentUser.ts';
import type { Queryable } from '../db/pool.ts';
import { HttpError } from '../http/errors.ts';
import { cleanText, isUuid, readWholeNumber } from '../http/validation.ts';
import { createClass, deleteClass, listClasses, renameClass } from '../school/classes.ts';

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;
const MAX_NAME_LENGTH = 50;

function readClassName(value: unknown): string {
  const name = cleanText(value, 1, MAX_NAME_LENGTH);
  if (!name) {
    throw new HttpError(400, 'invalid_class_name', 'Enter the class name (1 to 50 characters).');
  }
  return name;
}

// A class that cannot belong to this school looks the same as one that does not exist.
function readClassId(value: unknown): string {
  if (!isUuid(value)) {
    throw new HttpError(404, 'not_found', 'Class not found.');
  }
  return value;
}

// Classes of the admin's school. A class belongs to one school year; subjects are added to it.
export function classesRouter(pool: Queryable): Router {
  const router = Router();
  router.use(requireRole('admin'));

  // Query: schoolYear (the year it starts in, for example 2026) to see one year only.
  router.get('/', async (req, res) => {
    const schoolYear =
      req.query.schoolYear === undefined
        ? undefined
        : readWholeNumber(req.query.schoolYear, MIN_YEAR, MIN_YEAR, MAX_YEAR);

    res.json({ classes: await listClasses(pool, { schoolId: getUser(req).schoolId, schoolYear }) });
  });

  router.post('/', async (req, res) => {
    const { name, schoolYear } = (req.body ?? {}) as Record<string, unknown>;
    const cleanName = readClassName(name);
    if (
      !Number.isInteger(schoolYear) ||
      (schoolYear as number) < MIN_YEAR ||
      (schoolYear as number) > MAX_YEAR
    ) {
      throw new HttpError(
        400,
        'invalid_school_year',
        'The school year is the year it starts in, for example 2026.',
      );
    }

    const created = await createClass(pool, {
      schoolId: getUser(req).schoolId,
      name: cleanName,
      schoolYear: schoolYear as number,
    });
    res.status(201).json({ class: created });
  });

  // Only the name can change. A class stays in its school year.
  router.patch('/:id', async (req, res) => {
    const classId = readClassId(req.params.id);
    const name = readClassName((req.body as { name?: unknown } | undefined)?.name);

    res.json({
      class: await renameClass(pool, { schoolId: getUser(req).schoolId, classId, name }),
    });
  });

  // Only a class without subjects can be deleted.
  router.delete('/:id', async (req, res) => {
    await deleteClass(pool, {
      schoolId: getUser(req).schoolId,
      classId: readClassId(req.params.id),
    });
    res.status(204).end();
  });

  return router;
}

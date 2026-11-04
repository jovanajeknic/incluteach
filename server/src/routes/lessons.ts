import { Router } from 'express';

import { getUser, requireRole } from '../auth/currentUser.ts';
import type { Queryable } from '../db/pool.ts';
import { HttpError } from '../http/errors.ts';
import { cleanText, isUuid, readWholeNumber } from '../http/validation.ts';
import {
  createLesson,
  deleteLesson,
  getLesson,
  listLessons,
  publishLesson,
  unpublishLesson,
  updateLesson,
  type LessonStatus,
} from '../lessons/lessons.ts';

const MAX_TITLE_LENGTH = 200;
// About 15 pages. Keeps the work of the AI (and so its cost) under control.
export const MAX_BODY_LENGTH = 40_000;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const STATUSES: readonly LessonStatus[] = ['draft', 'processing', 'in_review', 'published'];

function readTitle(value: unknown): string {
  const title = cleanText(value, 1, MAX_TITLE_LENGTH);
  if (!title) {
    throw new HttpError(
      400,
      'invalid_title',
      'Enter the title of the lesson (1 to 200 characters).',
    );
  }
  return title;
}

// The text keeps its line breaks and spaces, only the line ends are made the same.
function readBody(value: unknown): string {
  if (typeof value !== 'string' || value.length > MAX_BODY_LENGTH) {
    throw new HttpError(
      400,
      'invalid_body',
      `The text of the lesson must be text of at most ${MAX_BODY_LENGTH} characters.`,
    );
  }
  return value.replace(/\r\n?/g, '\n');
}

// A lesson that the person may not see looks the same as one that does not exist.
function readLessonId(value: unknown): string {
  if (!isUuid(value)) {
    throw new HttpError(404, 'not_found', 'Lesson not found.');
  }
  return value;
}

function readOptionalUuid(value: unknown, what: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isUuid(value)) {
    throw new HttpError(400, 'invalid_request', `The ${what} is not valid.`);
  }
  return value;
}

// Lessons. A teacher makes and manages the lessons of the subjects they teach; students and
// parents read the published lessons of the subjects the student joined.
export function lessonsRouter(pool: Queryable): Router {
  const router = Router();

  // Query: subjectId, status (teachers), studentId (a parent narrows to one child), limit and
  // offset.
  router.get('/', requireRole('teacher', 'student', 'parent'), async (req, res) => {
    const { status } = req.query;
    if (status !== undefined && !STATUSES.includes(status as LessonStatus)) {
      throw new HttpError(400, 'invalid_request', 'Unknown status.');
    }

    res.json(
      await listLessons(pool, {
        user: getUser(req),
        subjectId: readOptionalUuid(req.query.subjectId, 'subject id'),
        status: status as LessonStatus | undefined,
        studentId: readOptionalUuid(req.query.studentId, 'student id'),
        limit: readWholeNumber(req.query.limit, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE),
        offset: readWholeNumber(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER),
      }),
    );
  });

  router.post('/', requireRole('teacher'), async (req, res) => {
    const { subjectId, title, body } = (req.body ?? {}) as Record<string, unknown>;
    if (!isUuid(subjectId)) {
      throw new HttpError(400, 'invalid_subject', 'Choose one of the subjects you teach.');
    }

    const lesson = await createLesson(pool, {
      user: getUser(req),
      subjectId,
      title: readTitle(title),
      body: body === undefined ? '' : readBody(body),
    });
    res.status(201).json({ lesson });
  });

  router.get('/:id', requireRole('teacher', 'student', 'parent'), async (req, res) => {
    const lesson = await getLesson(pool, {
      user: getUser(req),
      lessonId: readLessonId(req.params.id),
    });
    res.json({ lesson });
  });

  // Changes the title, the text, or both. Only while the lesson is a draft or in review.
  router.patch('/:id', requireRole('teacher'), async (req, res) => {
    const lessonId = readLessonId(req.params.id);
    const { title, body } = (req.body ?? {}) as Record<string, unknown>;
    if (title === undefined && body === undefined) {
      throw new HttpError(400, 'invalid_request', 'Send a new title, a new text, or both.');
    }

    const lesson = await updateLesson(pool, {
      user: getUser(req),
      lessonId,
      title: title === undefined ? undefined : readTitle(title),
      body: body === undefined ? undefined : readBody(body),
    });
    res.json({ lesson });
  });

  // Only while the lesson is a draft or in review, never while students can read it.
  router.delete('/:id', requireRole('teacher'), async (req, res) => {
    await deleteLesson(pool, { user: getUser(req), lessonId: readLessonId(req.params.id) });
    res.status(204).end();
  });

  router.post('/:id/publish', requireRole('teacher'), async (req, res) => {
    const lesson = await publishLesson(pool, {
      user: getUser(req),
      lessonId: readLessonId(req.params.id),
    });
    res.json({ lesson });
  });

  router.post('/:id/unpublish', requireRole('teacher'), async (req, res) => {
    const lesson = await unpublishLesson(pool, {
      user: getUser(req),
      lessonId: readLessonId(req.params.id),
    });
    res.json({ lesson });
  });

  return router;
}

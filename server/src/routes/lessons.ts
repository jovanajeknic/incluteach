import express, { Router, type RequestHandler } from 'express';

import { ContentError, validateQuiz, validateSummary } from '../ai/validate.ts';
import { getUser, requireRole } from '../auth/currentUser.ts';
import type { Queryable } from '../db/pool.ts';
import { HttpError } from '../http/errors.ts';
import { cleanText, isUuid, readWholeNumber } from '../http/validation.ts';
import { approveContent, deleteContent, saveQuiz, saveSummary } from '../lessons/editContent.ts';
import { extractLessonText } from '../lessons/extract/index.ts';
import { startGeneration, type GenerationOptions } from '../lessons/generate.ts';
import { MAX_BODY_LENGTH, MAX_FILE_BYTES } from '../lessons/limits.ts';
import {
  createLesson,
  deleteLesson,
  getLesson,
  listLessons,
  publishLesson,
  setBodyFromFile,
  unpublishLesson,
  updateLesson,
  type LessonStatus,
} from '../lessons/lessons.ts';

const MAX_TITLE_LENGTH = 200;
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

// The file arrives as the plain content of the request (not as a form), whatever its type
// says. Too large a file gets its own clear error.
const fileBody: RequestHandler = (req, res, next) => {
  express.raw({ type: () => true, limit: MAX_FILE_BYTES })(req, res, (error?: unknown) => {
    if ((error as { type?: string } | undefined)?.type === 'entity.too.large') {
      next(
        new HttpError(
          413,
          'file_too_large',
          `The file is larger than ${MAX_FILE_BYTES / (1024 * 1024)} MB.`,
        ),
      );
      return;
    }
    next(error);
  });
};

// The name the browser sent along, made safe to keep: decoded, without a folder, without
// control characters, and not too long.
function readFileName(header: unknown): string | null {
  if (typeof header !== 'string' || header === '') {
    return null;
  }

  let name = header;
  try {
    name = decodeURIComponent(header);
  } catch {
    // Not encoded: use it as it is.
  }
  const cleaned = (name.split(/[\\/]/).pop() ?? '')
    .replace(/\p{Cc}/gu, '')
    .trim()
    .slice(0, 255);
  return cleaned === '' ? null : cleaned;
}

// Lessons. A teacher makes and manages the lessons of the subjects they teach; students and
// parents read the published lessons of the subjects the student joined.
export function lessonsRouter(pool: Queryable, generation: GenerationOptions): Router {
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

  // Fills the lesson with the text of a Word (.docx) or PDF file. The body of the request is
  // the file itself (at most 10 MB); the name can be sent in the X-File-Name header, written
  // with encodeURIComponent. The type is found out from the content. The text replaces what
  // the lesson had; the teacher reads and corrects it afterwards. `warnings` says what is not
  // in the text, such as the pictures of a PDF.
  router.post('/:id/source', requireRole('teacher'), fileBody, async (req, res) => {
    const lessonId = readLessonId(req.params.id);
    const file: unknown = req.body;
    if (!Buffer.isBuffer(file) || file.length === 0) {
      throw new HttpError(400, 'invalid_request', 'Send the file as the body of the request.');
    }

    const { text, source, imageCount } = await extractLessonText(file);
    const lesson = await setBodyFromFile(pool, {
      user: getUser(req),
      lessonId,
      text,
      source,
      fileName: readFileName(req.get('x-file-name')),
    });
    // Things the teacher should know about the file, as codes the screen turns into a message.
    const warnings = imageCount > 0 ? [{ code: 'images_not_included', count: imageCount }] : [];
    res.json({ lesson, warnings });
  });

  // Asks the AI to make a summary and/or a quiz from the text of the lesson. Answers 202 at
  // once with the lesson in the state "processing"; the work goes on in the background. Ask
  // for the lesson (GET /lessons/{id}) every few seconds until the state changes: "in_review"
  // means the results are ready for the teacher, "draft" with a `processingError` that the AI
  // failed. Body: { summary?: boolean, quiz?: boolean }, both on when left out.
  router.post('/:id/generate', requireRole('teacher'), async (req, res) => {
    const lessonId = readLessonId(req.params.id);
    const { summary = true, quiz = true } = (req.body ?? {}) as Record<string, unknown>;
    if (typeof summary !== 'boolean' || typeof quiz !== 'boolean' || (!summary && !quiz)) {
      throw new HttpError(400, 'invalid_request', 'Choose the summary, the quiz, or both.');
    }

    const lesson = await startGeneration(pool, generation, {
      user: getUser(req),
      lessonId,
      summary,
      quiz,
    });
    res.status(202).json({ lesson });
  });

  // The summary and the quiz of a lesson are written, edited and approved by its teacher,
  // whether the AI made them first or not. Every change makes them a draft again, and only
  // approved ones can be published. Not while the lesson is published or being processed.
  const checked = <T>(code: string, check: (value: unknown) => T, value: unknown): T => {
    try {
      return check(value);
    } catch (error) {
      if (error instanceof ContentError) {
        throw new HttpError(400, code, error.message);
      }
      throw error;
    }
  };

  // Body: { points: string[] }. Writes the summary, or replaces the existing one.
  router.put('/:id/summary', requireRole('teacher'), async (req, res) => {
    const lessonId = readLessonId(req.params.id);
    const content = checked('invalid_summary', validateSummary, req.body);

    res.json({ lesson: await saveSummary(pool, { user: getUser(req), lessonId, content }) });
  });

  // Body: { questions: [...] }, the whole quiz. Writes it, or replaces the existing one.
  router.put('/:id/quiz', requireRole('teacher'), async (req, res) => {
    const lessonId = readLessonId(req.params.id);
    const content = checked('invalid_quiz', validateQuiz, req.body);

    res.json({ lesson: await saveQuiz(pool, { user: getUser(req), lessonId, content }) });
  });

  for (const part of ['summary', 'quiz'] as const) {
    router.delete(`/:id/${part}`, requireRole('teacher'), async (req, res) => {
      const lessonId = readLessonId(req.params.id);
      res.json({ lesson: await deleteContent(pool, { user: getUser(req), lessonId, part }) });
    });

    router.post(`/:id/${part}/approve`, requireRole('teacher'), async (req, res) => {
      const lessonId = readLessonId(req.params.id);
      res.json({ lesson: await approveContent(pool, { user: getUser(req), lessonId, part }) });
    });
  }

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

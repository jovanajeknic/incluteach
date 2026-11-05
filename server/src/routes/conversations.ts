import { Router } from 'express';

import { getUser, requireRole } from '../auth/currentUser.ts';
import { addMessage, getConversation, listConversations } from '../conversations/conversations.ts';
import type { Queryable } from '../db/pool.ts';
import { HttpError } from '../http/errors.ts';
import { isUuid, readWholeNumber } from '../http/validation.ts';

const DEFAULT_MESSAGES = 100;
const MAX_MESSAGES = 200;
const MAX_BODY_LENGTH = 1000;

function readUuid(value: unknown, code: string, message: string): string {
  if (!isUuid(value)) {
    throw new HttpError(400, code, message);
  }
  return value;
}

// A message keeps its line breaks, but not the blank space around it.
function readBody(value: unknown): string {
  const text = typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim() : '';
  if (text.length < 1 || text.length > MAX_BODY_LENGTH) {
    throw new HttpError(
      400,
      'invalid_message',
      `The message must be 1 to ${MAX_BODY_LENGTH} characters.`,
    );
  }
  return text;
}

// The conversation between the parents of a child and the teacher of a subject. Seen and
// written in only by the teacher of the subject and the parents linked to the child.
export function conversationsRouter(pool: Queryable): Router {
  const router = Router();

  // The conversations that have messages, newest first, for an inbox.
  router.get('/', requireRole('parent', 'teacher'), async (req, res) => {
    res.json({
      conversations: await listConversations(pool, {
        user: getUser(req),
        limit: readWholeNumber(req.query.limit, DEFAULT_MESSAGES, 1, MAX_MESSAGES),
      }),
    });
  });

  // Query: studentId, subjectId (both needed), limit (the newest messages, default 100).
  router.get('/messages', requireRole('parent', 'teacher'), async (req, res) => {
    res.json(
      await getConversation(pool, {
        user: getUser(req),
        studentId: readUuid(req.query.studentId, 'invalid_student', 'Choose a student.'),
        subjectId: readUuid(req.query.subjectId, 'invalid_subject', 'Choose a subject.'),
        limit: readWholeNumber(req.query.limit, DEFAULT_MESSAGES, 1, MAX_MESSAGES),
      }),
    );
  });

  // Body: { studentId, subjectId, body }.
  router.post('/messages', requireRole('parent', 'teacher'), async (req, res) => {
    const { studentId, subjectId, body } = (req.body ?? {}) as Record<string, unknown>;
    const message = await addMessage(pool, {
      user: getUser(req),
      studentId: readUuid(studentId, 'invalid_student', 'Choose a student.'),
      subjectId: readUuid(subjectId, 'invalid_subject', 'Choose a subject.'),
      body: readBody(body),
    });
    res.status(201).json({ message });
  });

  return router;
}

import { Router } from 'express';

import { getUser, requireRole } from '../auth/currentUser.ts';
import type { Queryable } from '../db/pool.ts';
import { HttpError } from '../http/errors.ts';
import { isUuid } from '../http/validation.ts';
import { answerQuestion, startAttempt } from '../quiz/attempts.ts';

function readId(value: unknown, what: string): string {
  if (!isUuid(value)) {
    throw new HttpError(404, 'not_found', `${what} not found.`);
  }
  return value;
}

// The quiz of a lesson, done by a student. The quiz is practice only: there is no score, the
// child is told after every answer if it was right, and may try again 10 minutes later.
export function quizRouter(pool: Queryable): Router {
  const router = Router();

  // Starts the quiz, or continues the one that is open. 201 for a new try, 200 for the open one.
  // Answers 409 `retry_later` (with details.nextAttemptAt) when the last try was too recent.
  router.post('/:id/quiz/attempts', requireRole('student'), async (req, res) => {
    const { attempt, resumed } = await startAttempt(pool, {
      user: getUser(req),
      lessonId: readId(req.params.id, 'Lesson'),
    });
    res.status(resumed ? 200 : 201).json({ attempt });
  });

  // Body: { questionId, optionId }. The answer tells at once if it was right.
  router.post('/:id/quiz/attempts/:attemptId/answers', requireRole('student'), async (req, res) => {
    const { questionId, optionId } = (req.body ?? {}) as Record<string, unknown>;
    if (!isUuid(questionId)) {
      throw new HttpError(400, 'invalid_question', 'Choose a question of the quiz.');
    }
    if (!isUuid(optionId)) {
      throw new HttpError(400, 'invalid_option', 'Choose one of the answers.');
    }

    res.json(
      await answerQuestion(pool, {
        user: getUser(req),
        lessonId: readId(req.params.id, 'Lesson'),
        attemptId: readId(req.params.attemptId, 'Try'),
        questionId,
        optionId,
      }),
    );
  });

  return router;
}

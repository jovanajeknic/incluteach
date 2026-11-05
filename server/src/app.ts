import express from 'express';

import { createFakeAi } from './ai/fake.ts';
import type { AiProvider } from './ai/types.ts';

import { authenticate } from './auth/currentUser.ts';
import type { ScryptCost } from './auth/password.ts';
import type { Queryable } from './db/pool.ts';
import { errorHandler, notFoundHandler } from './http/errors.ts';
import { rejectNul } from './http/rejectNul.ts';
import { requestLog } from './http/requestLog.ts';
import { authRouter } from './routes/auth.ts';
import { classesRouter } from './routes/classes.ts';
import { conversationsRouter } from './routes/conversations.ts';
import { catalogRouter, enrollmentsRouter } from './routes/enrollments.ts';
import { BackgroundJobs } from './lessons/jobs.ts';
import { healthRouter } from './routes/health.ts';
import { lessonsRouter } from './routes/lessons.ts';
import { quizRouter } from './routes/quiz.ts';
import { starsRouter } from './routes/stars.ts';
import { parentLinksRouter } from './routes/parentLinks.ts';
import { subjectsRouter } from './routes/subjects.ts';
import { usersRouter } from './routes/users.ts';

export interface AppDependencies {
  pool: Queryable;
  secureCookies?: boolean;
  // Address of the website that activation links point to.
  publicUrl?: string;
  // Only tests set this, to make password hashing quicker.
  passwordCost?: ScryptCost;
  // Writes one line per request (method, path, status, time). Off by default; the server turns it on.
  logRequests?: boolean;
  // The AI service for summaries and quizzes. The fake one is used when none is given.
  ai?: AiProvider;
  // Runs work that goes on after the answer is sent. Tests pass their own to wait for it.
  jobs?: BackgroundJobs;
  // How long to wait for the AI before giving up. Only tests change it.
  aiTimeoutMs?: number;
}

// Builds the Express app without starting it, so tests can call it directly.
export function createApp({
  pool,
  secureCookies = false,
  publicUrl = 'http://localhost:5173',
  passwordCost,
  logRequests = false,
  ai = createFakeAi(),
  jobs = new BackgroundJobs(),
  aiTimeoutMs,
}: AppDependencies): express.Express {
  const app = express();

  // Do not tell the world which framework runs the server.
  app.disable('x-powered-by');
  if (logRequests) {
    app.use(requestLog());
  }
  // Large enough for a lesson of about 40,000 characters (Serbian letters take two bytes).
  app.use(express.json({ limit: '256kb' }));
  app.use(rejectNul);
  app.use(authenticate(pool));

  app.use(healthRouter(pool, { ai: ai.name }));
  app.use('/auth', authRouter(pool, { secureCookies, passwordCost }));
  app.use('/users', usersRouter(pool, { publicUrl }));
  app.use('/classes', classesRouter(pool));
  app.use('/subjects', subjectsRouter(pool));
  app.use('/parent-students', parentLinksRouter(pool));
  app.use('/catalog', catalogRouter(pool));
  app.use('/enrollments', enrollmentsRouter(pool));
  app.use('/lessons', lessonsRouter(pool, { ai, jobs, timeoutMs: aiTimeoutMs }));
  app.use('/lessons', quizRouter(pool));
  app.use('/stars', starsRouter(pool));
  app.use('/conversations', conversationsRouter(pool));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

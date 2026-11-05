import { http, HttpResponse } from 'msw';
import type { Lesson, Quiz, QuizQuestionInput, Summary } from '@/features/lessons/api/lessonsApi';
import { apiError } from './authFixtures';
import { quizOf, summaryOf } from './lessonApiFixtures';
import { server } from './server';

/**
 * A fake backend that keeps one lesson in memory, so that every change made through the API is
 * visible in the next answer, like on the real server. `sent` records what the page sent.
 */
export function keepLesson(initial: Lesson, options: { ai?: string } = {}) {
  const state = {
    lesson: initial,
    sent: {
      generate: [] as unknown[],
      summary: [] as string[][],
      quiz: [] as QuizQuestionInput[][],
      approved: [] as string[],
      published: 0,
    },
    /** Makes the next call of the given kind fail with an error code. */
    failNext: null as { code: string; status: number } | null,
  };
  const touch = (changes: Partial<Lesson>) => {
    state.lesson = { ...state.lesson, ...changes, updatedAt: '2026-11-05T12:00:00.000Z' };
    return HttpResponse.json({ lesson: state.lesson });
  };
  const failure = () => {
    const next = state.failNext;
    state.failNext = null;
    return next ? HttpResponse.json(apiError(next.code), { status: next.status }) : null;
  };

  server.use(
    http.get('*/api/health', () => HttpResponse.json({ status: 'ok', ai: options.ai ?? 'fake' })),
    http.get('*/api/lessons/:id', () => HttpResponse.json({ lesson: state.lesson })),
    http.patch('*/api/lessons/:id', async ({ request }) => {
      return touch((await request.json()) as Partial<Lesson>);
    }),
    http.post('*/api/lessons/:id/generate', async ({ request }) => {
      state.sent.generate.push(await request.json());
      return failure() ?? touch({ status: 'processing', processingError: null });
    }),
    http.put('*/api/lessons/:id/summary', async ({ request }) => {
      const { points } = (await request.json()) as { points: string[] };
      state.sent.summary.push(points);
      const failed = failure();
      if (failed) return failed;
      const previous = state.lesson.summary;
      const summary: Summary = summaryOf({
        origin: previous?.origin ?? 'teacher',
        status: 'draft',
        outdated: false,
        approvedAt: null,
        points,
        updatedAt: `2026-11-05T12:0${state.sent.summary.length}:00.000Z`,
      });
      return touch({ summary });
    }),
    http.delete('*/api/lessons/:id/summary', () => touch({ summary: null })),
    http.put('*/api/lessons/:id/quiz', async ({ request }) => {
      const { questions } = (await request.json()) as { questions: QuizQuestionInput[] };
      state.sent.quiz.push(questions);
      const failed = failure();
      if (failed) return failed;
      const quiz: Quiz = quizOf(
        {
          origin: state.lesson.quiz?.origin ?? 'teacher',
          updatedAt: `2026-11-05T13:0${state.sent.quiz.length}:00.000Z`,
        },
        questions,
      );
      return touch({ quiz });
    }),
    http.delete('*/api/lessons/:id/quiz', () => touch({ quiz: null })),
    http.post('*/api/lessons/:id/quiz/approve', () => {
      state.sent.approved.push('quiz');
      const failed = failure();
      if (failed) return failed;
      const quiz: Quiz = {
        ...state.lesson.quiz!,
        status: 'approved',
        outdated: false,
        approvedAt: '2026-11-05T13:30:00.000Z',
        updatedAt: '2026-11-05T13:30:00.000Z',
      };
      return touch({ quiz });
    }),
    http.post('*/api/lessons/:id/publish', () => {
      state.sent.published += 1;
      const failed = failure();
      if (failed) return failed;
      return touch({ status: 'published', publishedAt: '2026-11-05T14:00:00.000Z' });
    }),
    http.post('*/api/lessons/:id/summary/approve', () => {
      state.sent.approved.push('summary');
      const failed = failure();
      if (failed) return failed;
      const summary = summaryOf({
        ...state.lesson.summary!,
        status: 'approved',
        outdated: false,
        approvedAt: '2026-11-05T12:30:00.000Z',
        updatedAt: '2026-11-05T12:30:00.000Z',
      });
      return touch({ summary });
    }),
  );

  return {
    sent: state.sent,
    /** What the AI finished, as the next answer for the lesson. */
    finish(changes: Partial<Lesson>) {
      state.lesson = { ...state.lesson, status: 'in_review', processingError: null, ...changes };
    },
    /** The AI gave up, as the next answer for the lesson. */
    fail(reason: string) {
      state.lesson = { ...state.lesson, status: 'draft', processingError: reason };
    },
    failNext(code: string, status: number) {
      state.failNext = { code, status };
    },
    get lesson() {
      return state.lesson;
    },
  };
}

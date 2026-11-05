import { http, HttpResponse } from 'msw';
import type { QuizHistory } from '@/features/subject-students/api/studentsApi';
import type { AttemptQuestion, MyProgress, StudentLesson } from '@/features/student/api/studentApi';
import { apiError } from './authFixtures';
import { server } from './server';
import { studentLessonOf } from './studentApiFixtures';

/** One question of the test quiz, with what only the server knows: the right answer. */
export interface QuizKey {
  id: string;
  kind: 'choice' | 'true_false';
  prompt: string;
  options: { id: string; text: string }[];
  correctId: string;
  explanation?: string | null;
}

export const quizKeys: QuizKey[] = [
  {
    id: 'q1',
    kind: 'choice',
    prompt: 'Šta biljke prave uz svjetlost?',
    options: [
      { id: 'q1a', text: 'Hranu' },
      { id: 'q1b', text: 'Vodu' },
      { id: 'q1c', text: 'Kamen' },
    ],
    correctId: 'q1a',
    explanation: 'Biljke prave hranu uz pomoć svjetlosti.',
  },
  {
    id: 'q2',
    kind: 'true_false',
    prompt: 'Biljke diše kroz lišće.',
    options: [
      { id: 'q2a', text: 'Tačno' },
      { id: 'q2b', text: 'Netačno' },
    ],
    correctId: 'q2a',
    explanation: null,
  },
];

/** How long after a try the fake server makes the student wait, in milliseconds. */
const WAIT_MS = 2000;

/**
 * A fake backend of the student's quiz: it keeps the try, the answers and the lesson, so each
 * answer changes what the next call returns, like on the real server. `calls` records what was
 * sent, `failNext` makes the next call of a kind fail with an error code.
 */
export function keepQuiz(options: { keys?: QuizKey[]; lesson?: StudentLesson } = {}) {
  const keys = options.keys ?? quizKeys;
  const state = {
    lesson: options.lesson ?? studentLessonOf(),
    tries: 0,
    given: [] as { questionId: string; optionId: string; correct: boolean }[],
    status: 'in_progress',
    allCorrect: null as boolean | null,
    history: [] as QuizHistory['attempts'],
    calls: { start: 0, answers: [] as unknown[], complete: 0 },
    failNext: {} as Partial<
      Record<'start' | 'answer' | 'complete', { code: string; status: number; details?: object }>
    >,
    /** A try that was left open: its questions already answered, in this order. */
    alreadyAnswered: [] as string[],
  };

  const questionsOf = (): AttemptQuestion[] =>
    keys.map((key, index) => {
      const answered = state.given.find((item) => item.questionId === key.id);
      return {
        id: key.id,
        position: index + 1,
        kind: key.kind,
        prompt: key.prompt,
        options: key.options.map((option, optionIndex) => ({
          ...option,
          position: optionIndex + 1,
        })),
        answer: answered
          ? {
              optionId: answered.optionId,
              correct: answered.correct,
              correctOptionId: key.correctId,
              explanation: key.explanation ?? null,
            }
          : null,
      };
    });

  const fail = (kind: 'start' | 'answer' | 'complete') => {
    const next = state.failNext[kind];
    delete state.failNext[kind];
    return next
      ? HttpResponse.json(
          { error: { ...apiError(next.code).error, details: next.details } },
          { status: next.status },
        )
      : null;
  };

  const setProgress = (changes: Partial<MyProgress>) => {
    state.lesson = { ...state.lesson, myProgress: { ...state.lesson.myProgress, ...changes } };
  };

  server.use(
    http.get('*/api/lessons/:id', () => HttpResponse.json({ lesson: state.lesson })),
    http.post('*/api/lessons/:id/quiz/attempts', () => {
      state.calls.start += 1;
      const failed = fail('start');
      if (failed) return failed;
      // A try that is finished is followed by a new one; an open one is gone on with.
      if (state.status !== 'in_progress') {
        state.given = [];
        state.status = 'in_progress';
        state.allCorrect = null;
      }
      state.tries += 1;
      return HttpResponse.json(
        {
          attempt: {
            id: `try-${state.tries}`,
            status: state.status,
            startedAt: '2026-11-05T10:00:00.000Z',
            completedAt: null,
            allCorrect: null,
            questions: questionsOf(),
          },
        },
        { status: state.given.length > 0 ? 200 : 201 },
      );
    }),
    http.post('*/api/lessons/:id/quiz/attempts/:tryId/answers', async ({ request }) => {
      const body = (await request.json()) as { questionId: string; optionId: string };
      state.calls.answers.push(body);
      const failed = fail('answer');
      if (failed) return failed;

      const key = keys.find((item) => item.id === body.questionId)!;
      const correct = body.optionId === key.correctId;
      state.given.push({ questionId: key.id, optionId: body.optionId, correct });
      const last = state.given.length === keys.length;
      if (last) {
        state.status = 'completed';
        state.allCorrect = state.given.every((item) => item.correct);
        state.history = [
          {
            id: `try-${state.tries}`,
            status: 'completed',
            startedAt: '2026-11-05T10:00:00.000Z',
            completedAt: '2026-11-05T10:05:00.000Z',
            allCorrect: state.allCorrect,
            answers: state.given.map((item, index) => {
              const question = keys.find((k) => k.id === item.questionId)!;
              return {
                position: index + 1,
                kind: question.kind,
                prompt: question.prompt,
                chosenText: question.options.find((o) => o.id === item.optionId)!.text,
                correctText: question.options.find((o) => o.id === question.correctId)!.text,
                explanation: question.explanation ?? null,
                correct: item.correct,
              };
            }),
          },
          ...state.history,
        ];
        setProgress(
          state.allCorrect
            ? { canFinish: true, quiz: { openAttemptId: null, nextAttemptAt: null, passed: true } }
            : {
                quiz: {
                  openAttemptId: null,
                  nextAttemptAt: new Date(Date.now() + WAIT_MS).toISOString(),
                  passed: false,
                },
              },
        );
      }
      return HttpResponse.json({
        answer: {
          questionId: key.id,
          optionId: body.optionId,
          correct,
          correctOptionId: key.correctId,
          explanation: key.explanation ?? null,
        },
        attempt: {
          id: `try-${state.tries}`,
          status: state.status,
          answered: state.given.length,
          total: keys.length,
          allCorrect: last ? state.allCorrect : null,
        },
      });
    }),
    http.post('*/api/lessons/:id/complete', () => {
      state.calls.complete += 1;
      const failed = fail('complete');
      if (failed) return failed;
      setProgress({ completed: true, completedAt: '2026-11-05T11:00:00.000Z', canFinish: true });
      return HttpResponse.json({ progress: state.lesson.myProgress });
    }),
    http.get('*/api/lessons/:id/quiz/attempts', () =>
      HttpResponse.json({
        student: { id: 'student', fullName: 'Ana Marković' },
        completedAt: state.lesson.myProgress.completedAt,
        attempts: state.history,
      }),
    ),
  );

  return {
    state,
    keys,
    /** The student left a try open with these questions answered right already. */
    leaveOpen(answeredIds: string[]) {
      state.given = answeredIds.map((id) => ({
        questionId: id,
        optionId: keys.find((key) => key.id === id)!.correctId,
        correct: true,
      }));
      setProgress({ quiz: { openAttemptId: 'try-0', nextAttemptAt: null, passed: false } });
    },
    setProgress,
    failNext(
      kind: 'start' | 'answer' | 'complete',
      code: string,
      status: number,
      details?: object,
    ) {
      state.failNext[kind] = { code, status, details };
    },
  };
}

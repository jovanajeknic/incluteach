import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiError } from '@/test/authFixtures';
import { keepQuiz } from '@/test/fakeQuizServer';
import { renderApp } from '@/test/renderApp';
import { server } from '@/test/server';
import { studentLessonOf } from '@/test/studentApiFixtures';
import type { StudentLesson } from '@/features/student/api/studentApi';

const LESSON_PATH = '/student/lessons/l1';
const READING_KEY = 'incluteach.reading.00000000-0000-4000-8000-000000000003';

beforeEach(() => window.localStorage.clear());
afterEach(() => window.localStorage.clear());

const progress = (changes: Partial<StudentLesson['myProgress']>) => ({
  ...studentLessonOf().myProgress,
  ...changes,
});

describe('Finishing the lesson', () => {
  it('waits for the quiz: it cannot be finished before all answers were right once', async () => {
    keepQuiz({ lesson: studentLessonOf({ myProgress: progress({ canFinish: false }) }) });
    renderApp({ path: LESSON_PATH });

    expect(await screen.findByText(/svi odgovori budu tačni/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Završi lekciju' })).not.toBeInTheDocument();
  });

  it('finishes it when the server allows, shows the day, and asks for the stars again', async () => {
    const fake = keepQuiz({
      lesson: studentLessonOf({
        myProgress: progress({
          canFinish: true,
          quiz: { openAttemptId: null, nextAttemptAt: null, passed: true },
        }),
      }),
    });
    let starsAsked = 0;
    server.use(
      http.get('*/api/stars', () => {
        starsAsked += 1;
        return HttpResponse.json({ stars: [], counts: { automatic: 0, teacher: 0 } });
      }),
    );
    const { user } = renderApp({ path: LESSON_PATH });

    await user.click(await screen.findByRole('button', { name: 'Završi lekciju' }));

    expect(
      await screen.findByText(/Lekcija je završena 5\. novembar 2026\. Zvjezdica je tvoja!/),
    ).toBeInTheDocument();
    expect(fake.state.calls.complete).toBe(1);
    expect(screen.queryByRole('button', { name: 'Završi lekciju' })).not.toBeInTheDocument();
    await waitFor(() => expect(starsAsked).toBeGreaterThan(1));
  });

  it('lets a lesson without a quiz be finished at once', async () => {
    const fake = keepQuiz({
      lesson: studentLessonOf({
        quiz: null,
        myProgress: progress({ canFinish: true, quiz: null }),
      }),
    });
    const { user } = renderApp({ path: LESSON_PATH });

    await user.click(await screen.findByRole('button', { name: 'Završi lekciju' }));

    expect(await screen.findByText(/Zvjezdica je tvoja!/)).toBeInTheDocument();
    expect(fake.state.calls.complete).toBe(1);
    expect(screen.queryByRole('heading', { name: 'Kviz' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Moji pokušaji' })).not.toBeInTheDocument();
  });

  it('explains when the lesson could not be finished', async () => {
    const fake = keepQuiz({
      lesson: studentLessonOf({ myProgress: progress({ canFinish: true }) }),
    });
    fake.failNext('complete', 'quiz_not_passed', 409);
    const { user } = renderApp({ path: LESSON_PATH });

    await user.click(await screen.findByRole('button', { name: 'Završi lekciju' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/svi odgovori budu tačni/);
    expect(screen.getByRole('button', { name: 'Završi lekciju' })).toBeEnabled();
  });

  it('shows a lesson that was finished before', async () => {
    keepQuiz({
      lesson: studentLessonOf({
        myProgress: progress({
          completed: true,
          completedAt: '2026-11-04T10:00:00.000Z',
          canFinish: true,
        }),
      }),
    });
    renderApp({ path: LESSON_PATH });

    expect(await screen.findByText(/Lekcija je završena 4\. novembar 2026\./)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Završi lekciju' })).not.toBeInTheDocument();
  });
});

describe('The quiz card', () => {
  it('goes on with an open try, says the quiz is done, and counts down to the next try', async () => {
    keepQuiz({
      lesson: studentLessonOf({
        myProgress: progress({
          quiz: {
            openAttemptId: 'try-1',
            nextAttemptAt: new Date(Date.now() + 90_000).toISOString(),
            passed: true,
          },
        }),
      }),
    });
    renderApp({ path: LESSON_PATH });

    expect(await screen.findByRole('link', { name: 'Nastavi kviz' })).toHaveAttribute(
      'href',
      '/student/lessons/l1/quiz',
    );
    expect(screen.getByText('Kviz je urađen: svi odgovori su bili tačni.')).toBeInTheDocument();
    expect(await screen.findByRole('timer')).toHaveTextContent(
      /Novi pokušaj kviza možeš za 1:\d\d/,
    );
  });
});

describe('The tries at the quiz', () => {
  const answerOf = (correct: boolean) => ({
    position: 1,
    kind: 'choice' as const,
    prompt: 'Šta biljke prave uz svjetlost?',
    chosenText: correct ? 'Hranu' : 'Vodu',
    correctText: 'Hranu',
    explanation: 'Biljke prave hranu uz pomoć svjetlosti.',
    correct,
  });
  const attempt = (id: string, day: string, allCorrect: boolean) => ({
    id,
    status: 'completed',
    startedAt: `2026-11-${day}T10:00:00.000Z`,
    completedAt: `2026-11-${day}T10:05:00.000Z`,
    allCorrect,
    answers: [answerOf(allCorrect)],
  });
  const history = [attempt('b', '05', true), attempt('a', '04', false)];

  it('are asked for only when opened, newest first, with every question and answer', async () => {
    keepQuiz();
    let asked = 0;
    server.use(
      http.get('*/api/lessons/:id/quiz/attempts', () => {
        asked += 1;
        return HttpResponse.json({
          student: { id: 's', fullName: 'Ana' },
          completedAt: null,
          attempts: history,
        });
      }),
    );
    const { user } = renderApp({ path: LESSON_PATH });
    await screen.findByRole('heading', { name: 'Moji pokušaji' });
    expect(asked).toBe(0);

    await user.click(screen.getByRole('button', { name: 'Pogledaj pokušaje' }));

    const attempts = await screen.findAllByText(/^Pokušaj \d/, { exact: false });
    expect(attempts.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Pokušaj 2 · Svi odgovori tačni'),
      expect.stringContaining('Pokušaj 1 · Netačno: 1 od 1'),
    ]);
    expect(screen.getByText(/Tvoj odgovor: Vodu · Tačan odgovor: Hranu/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sakrij pokušaje' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(asked).toBe(1);
  });

  it('say so when the student has not tried the quiz', async () => {
    keepQuiz();
    const { user } = renderApp({ path: LESSON_PATH });

    await user.click(await screen.findByRole('button', { name: 'Pogledaj pokušaje' }));

    expect(await screen.findByText('Još nisi pokušao/la kviz ove lekcije.')).toBeInTheDocument();
  });

  it('are shown in the script the student chose', async () => {
    window.localStorage.setItem(READING_KEY, JSON.stringify({ script: 'cyrillic' }));
    const fake = keepQuiz();
    fake.state.history = [attempt('a', '04', false)];
    const { user } = renderApp({ path: LESSON_PATH });

    await user.click(await screen.findByRole('button', { name: 'Pogledaj pokušaje' }));

    expect(await screen.findByText(/Шта биљке праве уз свјетлост\?/)).toBeInTheDocument();
    expect(screen.getByText(/Воду/)).toBeInTheDocument();
  });

  it('can be asked for again when they could not be loaded', async () => {
    keepQuiz();
    let calls = 0;
    server.use(
      http.get('*/api/lessons/:id/quiz/attempts', () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(apiError('internal_error'), { status: 500 })
          : HttpResponse.json({
              student: { id: 's', fullName: 'Ana' },
              completedAt: null,
              attempts: [],
            });
      }),
    );
    const { user } = renderApp({ path: LESSON_PATH });

    await user.click(await screen.findByRole('button', { name: 'Pogledaj pokušaje' }));
    await user.click(await screen.findByRole('button', { name: 'Pokušaj ponovo' }));

    expect(await screen.findByText('Još nisi pokušao/la kviz ove lekcije.')).toBeInTheDocument();
  });
});

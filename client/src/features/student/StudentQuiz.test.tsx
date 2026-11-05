import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiError } from '@/test/authFixtures';
import { keepQuiz } from '@/test/fakeQuizServer';
import { renderApp } from '@/test/renderApp';
import { server } from '@/test/server';
import { stubVoice } from '@/test/speechStub';
import { studentLessonOf } from '@/test/studentApiFixtures';

const QUIZ_PATH = '/student/lessons/l1/quiz';
const READING_KEY = 'incluteach.reading.00000000-0000-4000-8000-000000000003';

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

const answer = async (user: ReturnType<typeof renderApp>['user'], name: string | RegExp) =>
  user.click(await screen.findByRole('button', { name }));

describe('Taking the quiz', () => {
  it('starts a try when the page opens and shows one question, with notes for the student', async () => {
    const fake = keepQuiz();
    renderApp({ path: QUIZ_PATH });

    expect(await screen.findByText('Pitanje 1 od 2')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Šta biljke prave uz svjetlost?' }),
    ).toBeInTheDocument();
    const options = within(screen.getByRole('group', { name: 'Odgovori' })).getAllByRole('button');
    // In the order the server sent them: the page never shuffles.
    expect(options.map((option) => option.textContent)).toEqual(['Hranu', 'Vodu', 'Kamen']);
    expect(screen.getByText(/bez ocjene/)).toBeInTheDocument();
    expect(screen.getByText(/roditelj i tvoj nastavnik vide/i)).toBeInTheDocument();
    expect(fake.state.calls.start).toBe(1);
  });

  it('tells at once when an answer is wrong: marks it, shows the right one and the explanation', async () => {
    const fake = keepQuiz();
    const { user } = renderApp({ path: QUIZ_PATH });

    await answer(user, 'Vodu');

    const feedback = screen.getByRole('status');
    await waitFor(() => expect(feedback).toHaveTextContent('Nije baš tako.'));
    expect(feedback).toHaveTextContent('Tačan odgovor: Hranu');
    expect(feedback).toHaveTextContent('Objašnjenje: Biljke prave hranu uz pomoć svjetlosti.');
    expect(screen.getByRole('button', { name: /Vodu.*tvoj odgovor/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Hranu.*tačan odgovor/ })).toBeDisabled();
    // Nothing more can be answered for this question.
    expect(screen.getByRole('button', { name: 'Kamen' })).toBeDisabled();
    expect(fake.state.calls.answers).toEqual([{ questionId: 'q1', optionId: 'q1b' }]);
    expect(screen.getByRole('button', { name: /Sljedeće pitanje/ })).toHaveFocus();
  });

  it('says "Tačno!" for a right answer, with no explanation when there is none', async () => {
    keepQuiz();
    const { user } = renderApp({ path: QUIZ_PATH });
    await answer(user, 'Hranu');
    await user.click(await screen.findByRole('button', { name: /Sljedeće pitanje/ }));

    expect(await screen.findByText('Pitanje 2 od 2')).toBeInTheDocument();
    await answer(user, 'Tačno');

    const feedback = screen.getByRole('status');
    await waitFor(() => expect(feedback).toHaveTextContent('Tačno!'));
    expect(feedback).not.toHaveTextContent('Objašnjenje');
    expect(screen.getByRole('button', { name: /Završi kviz/ })).toBeInTheDocument();
  });

  it('shows true/false answers as Tačno and Netačno', async () => {
    keepQuiz();
    const { user } = renderApp({ path: QUIZ_PATH });
    await answer(user, 'Hranu');
    await user.click(await screen.findByRole('button', { name: /Sljedeće pitanje/ }));

    const options = within(await screen.findByRole('group', { name: 'Odgovori' })).getAllByRole(
      'button',
    );
    expect(options.map((option) => option.textContent)).toEqual(['Tačno', 'Netačno']);
  });

  describe('when every answer is right', () => {
    async function allRight(user: ReturnType<typeof renderApp>['user']) {
      await answer(user, 'Hranu');
      await user.click(await screen.findByRole('button', { name: /Sljedeće pitanje/ }));
      await answer(user, 'Tačno');
      await user.click(await screen.findByRole('button', { name: /Završi kviz/ }));
    }

    it('celebrates and lets the student finish the lesson, which gives a star', async () => {
      const fake = keepQuiz();
      let starsAsked = 0;
      server.use(
        http.get('*/api/stars', () => {
          starsAsked += 1;
          return HttpResponse.json({
            stars: [],
            counts: { automatic: starsAsked > 1 ? 1 : 0, teacher: 0 },
          });
        }),
      );
      const { user } = renderApp({ path: QUIZ_PATH });
      await allRight(user);

      expect(
        await screen.findByRole('heading', { name: 'Bravo! Svi odgovori su tačni.' }),
      ).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Završi lekciju' }));

      expect(
        await screen.findByRole('heading', { name: 'Lekcija je završena. Zvjezdica je tvoja!' }),
      ).toBeInTheDocument();
      expect(fake.state.calls.complete).toBe(1);
      // The number of stars is asked again, so the menu is right at once.
      await waitFor(() => expect(starsAsked).toBeGreaterThan(1));
      expect(screen.queryByRole('button', { name: 'Završi lekciju' })).not.toBeInTheDocument();
      for (const link of screen.getAllByRole('link', { name: 'Nazad na lekciju' })) {
        expect(link).toHaveAttribute('href', '/student/lessons/l1');
      }
    });

    it('explains when the server will not finish the lesson', async () => {
      const fake = keepQuiz();
      fake.failNext('complete', 'quiz_not_passed', 409);
      const { user } = renderApp({ path: QUIZ_PATH });
      await allRight(user);

      await user.click(await screen.findByRole('button', { name: 'Završi lekciju' }));

      expect(await screen.findByRole('status')).toHaveTextContent(/svi odgovori budu tačni/);
      expect(screen.getByRole('button', { name: 'Završi lekciju' })).toBeEnabled();
    });
  });

  describe('when some answers are wrong', () => {
    async function oneWrong(user: ReturnType<typeof renderApp>['user']) {
      await answer(user, 'Vodu');
      await user.click(await screen.findByRole('button', { name: /Sljedeće pitanje/ }));
      await answer(user, 'Tačno');
      await user.click(await screen.findByRole('button', { name: /Završi kviz/ }));
    }

    it('is calm about it, shows no score, and makes the student wait before trying again', async () => {
      keepQuiz();
      const { user } = renderApp({ path: QUIZ_PATH });
      await oneWrong(user);

      expect(await screen.findByRole('heading', { name: 'Dobar pokušaj!' })).toBeInTheDocument();
      expect(screen.getByText(/Pročitaj lekciju još jednom/)).toBeInTheDocument();
      // Practice only: no points, no percent, no "x of y correct".
      expect(document.body.textContent).not.toMatch(/\d+\s*(od|\/)\s*\d+\s*tačn|\d+\s*%/i);
      expect(screen.queryByRole('button', { name: 'Završi lekciju' })).not.toBeInTheDocument();
      expect(await screen.findByRole('timer')).toHaveTextContent(/Novi pokušaj možeš za 0:0[12]/);
      expect(screen.getByRole('button', { name: 'Probaj ponovo' })).toBeDisabled();
      expect(screen.getByRole('link', { name: 'Pročitaj lekciju' })).toHaveAttribute(
        'href',
        '/student/lessons/l1',
      );
    });

    it('lets the student try again when the time has come, with the questions unanswered', async () => {
      const fake = keepQuiz();
      const { user } = renderApp({ path: QUIZ_PATH });
      await oneWrong(user);

      const again = await screen.findByRole('button', { name: 'Probaj ponovo' });
      await waitFor(() => expect(again).toBeEnabled(), { timeout: 4000 });
      await user.click(again);

      expect(await screen.findByText('Pitanje 1 od 2')).toBeInTheDocument();
      expect(fake.state.calls.start).toBe(2);
      expect(screen.getByRole('button', { name: 'Hranu' })).toBeEnabled();
    }, 10000);
  });
});

describe('Coming back to the quiz', () => {
  it('goes on with the try that is still open, at the first question not answered', async () => {
    const fake = keepQuiz();
    fake.leaveOpen(['q1']);
    renderApp({ path: QUIZ_PATH });

    expect(await screen.findByText('Pitanje 2 od 2')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Biljke diše kroz lišće.' }),
    ).toBeInTheDocument();
  });

  it('shows the wait when the server says a new try is not yet allowed', async () => {
    const fake = keepQuiz();
    fake.failNext('start', 'retry_later', 409, {
      nextAttemptAt: new Date(Date.now() + 2000).toISOString(),
    });
    const { user } = renderApp({ path: QUIZ_PATH });

    expect(await screen.findByRole('heading', { name: 'Još malo sačekaj' })).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent(/Novi pokušaj možeš za 0:0[12]/);
    expect(screen.getByRole('link', { name: 'Pročitaj lekciju' })).toBeInTheDocument();
    const again = screen.getByRole('button', { name: 'Probaj ponovo' });
    expect(again).toBeDisabled();

    await waitFor(() => expect(again).toBeEnabled(), { timeout: 4000 });
    await user.click(again);

    expect(await screen.findByText('Pitanje 1 od 2')).toBeInTheDocument();
  }, 10000);

  it('starts again when the teacher changed the quiz in the middle of a try', async () => {
    const fake = keepQuiz();
    const { user } = renderApp({ path: QUIZ_PATH });
    await screen.findByText('Pitanje 1 od 2');
    fake.failNext('answer', 'quiz_changed', 409);

    await answer(user, 'Hranu');

    expect(
      await screen.findByRole('heading', { name: 'Nastavnik je promijenio kviz' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Počni ispočetka' }));
    expect(await screen.findByText('Pitanje 1 od 2')).toBeInTheDocument();
    expect(fake.state.calls.start).toBe(2);
  });

  it('keeps the question and says why when an answer could not be sent', async () => {
    const fake = keepQuiz();
    const { user } = renderApp({ path: QUIZ_PATH });
    await screen.findByText('Pitanje 1 od 2');
    server.use(
      http.post('*/api/lessons/:id/quiz/attempts/:tryId/answers', () => HttpResponse.error()),
    );

    await answer(user, 'Hranu');

    expect(await screen.findByRole('alert')).toHaveTextContent('Server trenutno nije dostupan');
    expect(screen.getByRole('button', { name: 'Hranu' })).toBeEnabled();
    expect(fake.state.given).toEqual([]);
  });

  it('offers a retry when the quiz could not be started', async () => {
    const fake = keepQuiz();
    fake.failNext('start', 'internal_error', 500);
    const { user } = renderApp({ path: QUIZ_PATH });

    await user.click(await screen.findByRole('button', { name: 'Pokušaj ponovo' }));

    expect(await screen.findByText('Pitanje 1 od 2')).toBeInTheDocument();
  });

  it('says there is no quiz for a lesson without one', async () => {
    keepQuiz({ lesson: studentLessonOf({ quiz: null }) });
    renderApp({ path: QUIZ_PATH });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Kviz nije pronađen' }),
    ).toBeInTheDocument();
  });

  it('says there is no quiz when the lesson cannot be seen', async () => {
    server.use(
      http.get('*/api/lessons/:id', () =>
        HttpResponse.json(apiError('not_found'), { status: 404 }),
      ),
    );
    renderApp({ path: QUIZ_PATH });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Kviz nije pronađen' }),
    ).toBeInTheDocument();
  });
});

describe('Reading and hearing the quiz', () => {
  it('shows the questions and answers in Cyrillic, with Tačno and Netačno too', async () => {
    window.localStorage.setItem(READING_KEY, JSON.stringify({ script: 'cyrillic' }));
    const fake = keepQuiz();
    const { user } = renderApp({ path: QUIZ_PATH });

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Шта биљке праве уз свјетлост?' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Храну' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Храну' }));
    // What is sent to the server is the id, so the script does not matter.
    await waitFor(() =>
      expect(fake.state.calls.answers).toEqual([{ questionId: 'q1', optionId: 'q1a' }]),
    );
    expect(await screen.findByText(/Биљке праве храну уз помоћ свјетлости./)).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /Сљедеће|Sljedeće pitanje/ }));
    expect(await screen.findByRole('button', { name: 'Тачно' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Нетачно' })).toBeInTheDocument();
  });

  it('follows the size and font the student chose', async () => {
    window.localStorage.setItem(READING_KEY, JSON.stringify({ size: 'xl', font: 'dyslexic' }));
    keepQuiz();
    renderApp({ path: QUIZ_PATH });

    const option = await screen.findByRole('button', { name: 'Hranu' });
    expect(option.className).toContain('text-2xl');
    expect(option.className).toContain('font-dyslexic');
  });

  it('reads the question and its answers aloud, in Latin script', async () => {
    window.localStorage.setItem(READING_KEY, JSON.stringify({ script: 'cyrillic' }));
    const spoken = stubVoice({ readAll: true });
    keepQuiz();
    const { user } = renderApp({ path: QUIZ_PATH });

    await user.click(await screen.findByRole('button', { name: 'Poslušaj pitanje' }));

    // The question and then each answer, all in Latin script although the screen is Cyrillic.
    expect(spoken).toEqual(['Šta biljke prave uz svjetlost?', 'Hranu', 'Vodu', 'Kamen']);
  });
});

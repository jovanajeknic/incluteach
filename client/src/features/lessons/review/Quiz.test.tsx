import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { keepLesson } from '@/test/fakeLessonServer';
import { lessonOf, quizOf, quizQuestions, summaryOf } from '@/test/lessonApiFixtures';
import { renderApp } from '@/test/renderApp';

const LESSON_PATH = '/teacher/lessons/30000000-0000-4000-8000-000000000001';

const inReview = (overrides = {}) =>
  lessonOf({ status: 'in_review', quiz: quizOf(), ...overrides });

describe('The quiz', () => {
  it('shows every question with its answers, the right one marked, and who made it', async () => {
    keepLesson(inReview());
    renderApp({ path: LESSON_PATH });

    expect(await screen.findByLabelText('Pitanje 1: tekst')).toHaveValue(
      'Šta biljke prave uz svjetlost?',
    );
    expect(screen.getByLabelText('Pitanje 1, odgovor 1')).toHaveValue('Hranu');
    expect(screen.getByLabelText('Pitanje 1: odgovor 1 je tačan')).toBeChecked();
    expect(screen.getByLabelText('Pitanje 1: odgovor 2 je tačan')).not.toBeChecked();
    expect(screen.getByLabelText('Pitanje 1: objašnjenje (nije obavezno)')).toHaveValue(
      'Biljke prave hranu uz pomoć svjetlosti.',
    );
    // True/false: two fixed answers, only the right one is chosen.
    expect(screen.getByLabelText('Pitanje 2: tačan odgovor je Tačno')).toBeChecked();
    expect(screen.getByLabelText('Pitanje 2: tačan odgovor je Netačno')).not.toBeChecked();
    expect(screen.queryByLabelText('Pitanje 2, odgovor 1')).not.toBeInTheDocument();
    const kinds = screen.getAllByRole('heading', { level: 4 });
    expect(kinds[0]).toHaveTextContent(/Pitanje 1.*Izbor odgovora/);
    expect(kinds[1]).toHaveTextContent(/Pitanje 2.*Tačno ili netačno/);
    expect(screen.getAllByText('Napravio AI, čeka odobrenje')).not.toHaveLength(0);
    expect(screen.getByText(/bez ocjene/)).toBeInTheDocument();
  });

  it('saves all the questions after an edit, with the right answer marked', async () => {
    const fake = keepLesson(inReview());
    const { user } = renderApp({ path: LESSON_PATH });
    const prompt = await screen.findByLabelText('Pitanje 1: tekst');
    const save = within(screen.getByRole('region', { name: 'Kviz' })).getByRole('button', {
      name: 'Sačuvaj',
    });
    expect(save).toBeDisabled();

    await user.clear(prompt);
    await user.type(prompt, '  Šta prave biljke?  ');
    await user.click(screen.getByLabelText('Pitanje 1: odgovor 2 je tačan'));
    await user.click(save);

    expect(await screen.findByText('Kviz je sačuvan.')).toBeInTheDocument();
    expect(fake.sent.quiz).toHaveLength(1);
    expect(fake.sent.quiz[0]![0]).toEqual({
      kind: 'choice',
      prompt: 'Šta prave biljke?',
      explanation: 'Biljke prave hranu uz pomoć svjetlosti.',
      options: [
        { text: 'Hranu', isCorrect: false },
        { text: 'Vodu', isCorrect: true },
        { text: 'Kamen', isCorrect: false },
      ],
    });
    expect(fake.sent.quiz[0]![1]).toEqual(quizQuestions[1]);
    await waitFor(() => expect(save).toBeDisabled());
  });

  it('changes which answer of a true/false question is right', async () => {
    const fake = keepLesson(inReview());
    const { user } = renderApp({ path: LESSON_PATH });

    await user.click(await screen.findByLabelText('Pitanje 2: tačan odgovor je Netačno'));
    await user.click(
      within(screen.getByRole('region', { name: 'Kviz' })).getByRole('button', { name: 'Sačuvaj' }),
    );

    await waitFor(() =>
      expect(fake.sent.quiz[0]![1]!.options).toEqual([
        { text: 'Tačno', isCorrect: false },
        { text: 'Netačno', isCorrect: true },
      ]),
    );
  });

  describe('the answers of a question with a choice', () => {
    it('adds a fourth answer, and not a fifth', async () => {
      keepLesson(inReview());
      const { user } = renderApp({ path: LESSON_PATH });
      await screen.findByLabelText('Pitanje 1: tekst');

      await user.click(screen.getAllByRole('button', { name: 'Dodaj odgovor' })[0]!);

      expect(screen.getByLabelText('Pitanje 1, odgovor 4')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Dodaj odgovor' })[0]).toBeDisabled();
    });

    it('cannot go below three answers', async () => {
      keepLesson(inReview());
      renderApp({ path: LESSON_PATH });
      await screen.findByLabelText('Pitanje 1: tekst');

      expect(screen.queryByRole('button', { name: /Ukloni odgovor/ })).not.toBeInTheDocument();
    });

    it('removes an answer, and keeps the right one marked when another one goes', async () => {
      const fake = keepLesson(inReview());
      const { user } = renderApp({ path: LESSON_PATH });
      await user.click(await screen.findByLabelText('Pitanje 1: odgovor 3 je tačan'));
      await user.click(screen.getAllByRole('button', { name: 'Dodaj odgovor' })[0]!);
      await user.type(screen.getByLabelText('Pitanje 1, odgovor 4'), 'Sunce');

      await user.click(screen.getByRole('button', { name: 'Ukloni odgovor 1 pitanja 1' }));

      // "Kamen" was third and right; it is second now, and still the right one.
      expect(screen.getByLabelText('Pitanje 1: odgovor 2 je tačan')).toBeChecked();
      expect(screen.getByLabelText('Pitanje 1, odgovor 2')).toHaveValue('Kamen');
      await user.click(
        within(screen.getByRole('region', { name: 'Kviz' })).getByRole('button', {
          name: 'Sačuvaj',
        }),
      );
      await waitFor(() =>
        expect(fake.sent.quiz[0]![0]!.options).toEqual([
          { text: 'Vodu', isCorrect: false },
          { text: 'Kamen', isCorrect: true },
          { text: 'Sunce', isCorrect: false },
        ]),
      );
    });

    it('marks nothing as right when the right answer is removed, and asks to choose again', async () => {
      const fake = keepLesson(inReview());
      const { user } = renderApp({ path: LESSON_PATH });
      await user.click((await screen.findAllByRole('button', { name: 'Dodaj odgovor' }))[0]!);
      await user.type(screen.getByLabelText('Pitanje 1, odgovor 4'), 'Sunce');

      await user.click(screen.getByRole('button', { name: 'Ukloni odgovor 1 pitanja 1' }));

      expect(screen.getByLabelText('Pitanje 1: odgovor 1 je tačan')).not.toBeChecked();
      await user.click(
        within(screen.getByRole('region', { name: 'Kviz' })).getByRole('button', {
          name: 'Sačuvaj',
        }),
      );
      expect(
        await screen.findByText('Označi tačan odgovor.', { selector: 'p' }),
      ).toBeInTheDocument();
      expect(fake.sent.quiz).toEqual([]);
    });
  });

  describe('refusing what the server would refuse', () => {
    async function trySaving(edit: (user: ReturnType<typeof renderApp>['user']) => Promise<void>) {
      const fake = keepLesson(inReview());
      const { user } = renderApp({ path: LESSON_PATH });
      await screen.findByLabelText('Pitanje 1: tekst');
      await edit(user);
      await user.click(
        within(screen.getByRole('region', { name: 'Kviz' })).getByRole('button', {
          name: 'Sačuvaj',
        }),
      );
      return fake;
    }

    it('an empty question', async () => {
      const fake = await trySaving((user) => user.clear(screen.getByLabelText('Pitanje 1: tekst')));
      expect(await screen.findByText('Napiši pitanje.')).toBeInTheDocument();
      expect(fake.sent.quiz).toEqual([]);
    });

    it('an empty answer', async () => {
      const fake = await trySaving((user) =>
        user.clear(screen.getByLabelText('Pitanje 1, odgovor 2')),
      );
      expect(await screen.findByText('Napiši odgovor ili ga ukloni.')).toBeInTheDocument();
      expect(fake.sent.quiz).toEqual([]);
    });

    it('two equal answers, whatever the letter case', async () => {
      const fake = await trySaving(async (user) => {
        const second = screen.getByLabelText('Pitanje 1, odgovor 2');
        await user.clear(second);
        await user.type(second, 'hranu');
      });
      expect(await screen.findByText('Odgovori moraju biti različiti.')).toBeInTheDocument();
      expect(fake.sent.quiz).toEqual([]);
    });

    it('a text that is too long', async () => {
      const fake = await trySaving(async () => {
        fireEvent.change(screen.getByLabelText('Pitanje 1: tekst'), {
          target: { value: 'x'.repeat(501) },
        });
      });
      expect(
        await screen.findByText('Pitanje može imati najviše 500 znakova.'),
      ).toBeInTheDocument();
      expect(fake.sent.quiz).toEqual([]);
    });

    it('a quiz without questions', async () => {
      const fake = await trySaving(async (user) => {
        await user.click(screen.getByRole('button', { name: 'Ukloni pitanje 2' }));
        await user.click(screen.getByRole('button', { name: 'Ukloni pitanje 1' }));
      });
      expect(await screen.findByText('Kviz mora imati bar jedno pitanje.')).toBeInTheDocument();
      expect(fake.sent.quiz).toEqual([]);
    });
  });

  describe('questions', () => {
    it('adds a question with a choice and one true/false, moves and removes questions', async () => {
      const fake = keepLesson(inReview());
      const { user } = renderApp({ path: LESSON_PATH });
      await screen.findByLabelText('Pitanje 1: tekst');

      await user.click(screen.getByRole('button', { name: 'Dodaj pitanje tačno / netačno' }));
      await user.type(screen.getByLabelText('Pitanje 3: tekst'), 'Je li nebo plavo?');
      await user.click(screen.getByLabelText('Pitanje 3: tačan odgovor je Tačno'));
      await user.click(screen.getByRole('button', { name: 'Pomjeri pitanje 3 gore' }));
      await user.click(screen.getByRole('button', { name: 'Ukloni pitanje 1' }));
      await user.click(screen.getByRole('button', { name: 'Dodaj pitanje sa izborom' }));
      await user.type(screen.getByLabelText('Pitanje 3: tekst'), 'Koja je boja trave?');
      await user.type(screen.getByLabelText('Pitanje 3, odgovor 1'), 'Zelena');
      await user.type(screen.getByLabelText('Pitanje 3, odgovor 2'), 'Plava');
      await user.type(screen.getByLabelText('Pitanje 3, odgovor 3'), 'Crvena');
      await user.click(screen.getByLabelText('Pitanje 3: odgovor 1 je tačan'));
      await user.click(
        within(screen.getByRole('region', { name: 'Kviz' })).getByRole('button', {
          name: 'Sačuvaj',
        }),
      );

      await waitFor(() => expect(fake.sent.quiz).toHaveLength(1));
      expect(fake.sent.quiz[0]!.map((question) => question.prompt)).toEqual([
        'Je li nebo plavo?',
        'Biljke diše kroz lišće.',
        'Koja je boja trave?',
      ]);
      expect(fake.sent.quiz[0]![0]).toEqual({
        kind: 'true_false',
        prompt: 'Je li nebo plavo?',
        options: [
          { text: 'Tačno', isCorrect: true },
          { text: 'Netačno', isCorrect: false },
        ],
      });
    });

    it('cannot move the first question up or the last one down', async () => {
      keepLesson(inReview());
      renderApp({ path: LESSON_PATH });
      await screen.findByLabelText('Pitanje 1: tekst');

      expect(screen.getByRole('button', { name: 'Pomjeri pitanje 1 gore' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Pomjeri pitanje 2 dolje' })).toBeDisabled();
    });

    it('stops adding at 20 questions', async () => {
      const many = Array.from({ length: 20 }, (_, i) => ({
        ...quizQuestions[1]!,
        prompt: `Pitanje broj ${i + 1}`,
      }));
      keepLesson(inReview({ quiz: quizOf({}, many) }));
      renderApp({ path: LESSON_PATH });

      expect(
        await screen.findByRole('button', { name: 'Dodaj pitanje sa izborom' }),
      ).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Dodaj pitanje tačno / netačno' })).toBeDisabled();
    });
  });

  it('shows the message of the server in Serbian when it refuses the quiz', async () => {
    const fake = keepLesson(inReview());
    fake.failNext('invalid_quiz', 400);
    const { user } = renderApp({ path: LESSON_PATH });
    const prompt = await screen.findByLabelText('Pitanje 1: tekst');

    await user.type(prompt, '?');
    await user.click(
      within(screen.getByRole('region', { name: 'Kviz' })).getByRole('button', { name: 'Sačuvaj' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Kviz nije ispravan');
    expect(prompt).toHaveValue('Šta biljke prave uz svjetlost??');
  });

  describe('approving', () => {
    it('approves what is saved, and shows the quiz as approved', async () => {
      const fake = keepLesson(inReview());
      const { user } = renderApp({ path: LESSON_PATH });

      await user.click(await screen.findByRole('button', { name: 'Odobri kviz' }));

      expect(await screen.findByText('Kviz je odobren.')).toBeInTheDocument();
      expect(fake.sent.approved).toEqual(['quiz']);
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Odobri kviz' })).toBeDisabled(),
      );
      expect(
        within(screen.getByRole('region', { name: 'Kviz' })).getByText('Odobren'),
      ).toBeInTheDocument();
    });

    it('asks to save the edits first', async () => {
      keepLesson(inReview());
      const { user } = renderApp({ path: LESSON_PATH });

      await user.type(await screen.findByLabelText('Pitanje 1: tekst'), '?');

      expect(screen.getByRole('button', { name: 'Odobri kviz' })).toBeDisabled();
      expect(screen.getByText('Prvo sačuvaj izmjene, pa odobri.')).toBeInTheDocument();
    });

    it('warns that the text changed, and approving again says it still fits', async () => {
      keepLesson(inReview({ quiz: quizOf({ status: 'approved', outdated: true }) }));
      const { user } = renderApp({ path: LESSON_PATH });

      expect(
        await screen.findByText(/Tekst lekcije se promijenio poslije izrade/),
      ).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Odobri kviz' }));

      await waitFor(() =>
        expect(
          screen.queryByText(/Tekst lekcije se promijenio poslije izrade/),
        ).not.toBeInTheDocument(),
      );
    });

    it('blocks leaving the page while there are unsaved edits', async () => {
      keepLesson(inReview());
      const { user, router } = renderApp({ path: LESSON_PATH });

      await user.type(await screen.findByLabelText('Pitanje 1: tekst'), '?');
      await user.click(screen.getByRole('link', { name: /Biologija · Odjeljenje 5-2/ }));

      const dialog = await screen.findByRole('alertdialog', { name: 'Napustiti stranicu?' });
      await user.click(within(dialog).getByRole('button', { name: 'Ostani' }));
      expect(router.state.location.pathname).toBe(LESSON_PATH);
    });
  });

  describe('deleting and writing by hand', () => {
    it('deletes the quiz after a question, and offers to write one', async () => {
      keepLesson(inReview());
      const { user } = renderApp({ path: LESSON_PATH });

      await user.click(await screen.findByRole('button', { name: 'Obriši kviz' }));
      await user.click(
        within(await screen.findByRole('alertdialog', { name: 'Obrisati kviz?' })).getByRole(
          'button',
          { name: 'Da, obriši' },
        ),
      );

      expect(await screen.findByText('Kviz je obrisan.')).toBeInTheDocument();
      expect(screen.getByText('Za ovu lekciju još nema kviza.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Napiši kviz sam/a' })).toBeInTheDocument();
    });

    it('writes a quiz from nothing and approves it', async () => {
      const fake = keepLesson(lessonOf());
      const { user } = renderApp({ path: LESSON_PATH });

      await user.click(await screen.findByRole('button', { name: 'Napiši kviz sam/a' }));
      await user.type(screen.getByLabelText('Pitanje 1: tekst'), 'Šta je list?');
      await user.type(screen.getByLabelText('Pitanje 1, odgovor 1'), 'Dio biljke');
      await user.type(screen.getByLabelText('Pitanje 1, odgovor 2'), 'Dio auta');
      await user.type(screen.getByLabelText('Pitanje 1, odgovor 3'), 'Dio kuće');
      await user.click(screen.getByLabelText('Pitanje 1: odgovor 1 je tačan'));
      await user.click(
        within(screen.getByRole('region', { name: 'Kviz' })).getByRole('button', {
          name: 'Sačuvaj',
        }),
      );

      expect(await screen.findByText('Nacrt, čeka odobrenje')).toBeInTheDocument();
      expect(fake.sent.quiz[0]).toEqual([
        {
          kind: 'choice',
          prompt: 'Šta je list?',
          options: [
            { text: 'Dio biljke', isCorrect: true },
            { text: 'Dio auta', isCorrect: false },
            { text: 'Dio kuće', isCorrect: false },
          ],
        },
      ]);
      await user.click(screen.getByRole('button', { name: 'Odobri kviz' }));
      await waitFor(() => expect(fake.sent.approved).toEqual(['quiz']));
    });
  });

  it('shows a published quiz as a plain list with the right answers marked', async () => {
    keepLesson(
      lessonOf({
        status: 'published',
        publishedAt: '2026-11-03T10:00:00.000Z',
        quiz: quizOf({ status: 'approved' }),
      }),
    );
    renderApp({ path: LESSON_PATH });

    const quiz = await screen.findByRole('region', { name: 'Kviz' });
    expect(within(quiz).getByText(/1\. Šta biljke prave uz svjetlost\?/)).toBeInTheDocument();
    expect(within(quiz).getByText(/Hranu/)).toHaveTextContent('Hranu (tačan odgovor)');
    expect(within(quiz).getByText(/Objašnjenje: Biljke prave hranu/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Pitanje 1: tekst')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Odobri kviz' })).not.toBeInTheDocument();
  });
});

describe('Publishing the reviewed lesson', () => {
  it('publishes once the summary and the quiz are approved', async () => {
    const fake = keepLesson(
      inReview({
        summary: summaryOf({ status: 'approved' }),
        quiz: quizOf({ status: 'approved' }),
      }),
    );
    const { user } = renderApp({ path: LESSON_PATH });

    await user.click(await screen.findByRole('button', { name: 'Objavi' }));

    expect(await screen.findByText(/Objavljena 5\. novembar 2026\./)).toBeInTheDocument();
    expect(fake.sent.published).toBe(1);
  });

  it('explains what is missing when the server says an approval is needed', async () => {
    const fake = keepLesson(inReview());
    fake.failNext('needs_approval', 409);
    const { user } = renderApp({ path: LESSON_PATH });

    await user.click(await screen.findByRole('button', { name: 'Objavi' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Odobri ih ili ih obriši');
  });
});

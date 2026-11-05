import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { keepLesson } from '@/test/fakeLessonServer';
import { lessonOf, summaryOf } from '@/test/lessonApiFixtures';
import { renderApp } from '@/test/renderApp';
import { server } from '@/test/server';

const LESSON_PATH = '/teacher/lessons/30000000-0000-4000-8000-000000000001';

describe('Asking the AI', () => {
  it('says that the AI is a test one when the server uses the fake', async () => {
    keepLesson(lessonOf(), { ai: 'fake' });
    renderApp({ path: LESSON_PATH });

    expect(await screen.findByText(/Test AI: rezultati su izmišljeni/)).toBeInTheDocument();
  });

  it('asks to read carefully when the AI is a real one, and says nothing if it is unknown', async () => {
    keepLesson(lessonOf(), { ai: 'groq' });
    renderApp({ path: LESSON_PATH });
    expect(await screen.findByText(/Pažljivo pročitaj šta je AI napravio/)).toBeInTheDocument();
    expect(screen.queryByText(/Test AI/)).not.toBeInTheDocument();
  });

  it('works without the label when the health check fails', async () => {
    keepLesson(lessonOf());
    server.use(http.get('*/api/health', () => HttpResponse.error()));
    renderApp({ path: LESSON_PATH });

    expect(await screen.findByRole('button', { name: 'Napravi sažetak i kviz' })).toBeEnabled();
    expect(screen.queryByText(/Test AI/)).not.toBeInTheDocument();
  });

  it('makes both, shows the AI at work, and then the summary it made, waiting for approval', async () => {
    const fake = keepLesson(lessonOf());
    const { user } = renderApp({ path: LESSON_PATH });

    await user.click(await screen.findByRole('button', { name: 'Napravi sažetak i kviz' }));

    expect(await screen.findByText('AI radi na sažetku i kvizu…')).toBeInTheDocument();
    expect(fake.sent.generate).toEqual([{ summary: true, quiz: true }]);
    expect(screen.getByLabelText(/Tekst lekcije/)).toHaveAttribute('readonly');

    // The AI finishes; the page asks again by itself and shows the result.
    fake.finish({ summary: summaryOf() });
    expect(await screen.findByLabelText('Tačka 1', {}, { timeout: 5000 })).toHaveValue(
      'Biljke prave hranu.',
    );
    expect(screen.getByText('Napravio AI, čeka odobrenje')).toBeInTheDocument();
    expect(screen.queryByText('AI radi na sažetku i kvizu…')).not.toBeInTheDocument();
  }, 12000);

  it('can make only the summary, and cannot be started with nothing chosen', async () => {
    const fake = keepLesson(lessonOf());
    const { user } = renderApp({ path: LESSON_PATH });
    await screen.findByRole('button', { name: 'Napravi sažetak i kviz' });

    await user.click(screen.getByRole('checkbox', { name: 'Kviz' }));
    await user.click(screen.getByRole('button', { name: 'Napravi' }));
    await waitFor(() => expect(fake.sent.generate).toEqual([{ summary: true, quiz: false }]));
  });

  it('is disabled when nothing is chosen', async () => {
    keepLesson(lessonOf());
    const { user } = renderApp({ path: LESSON_PATH });
    await screen.findByRole('button', { name: 'Napravi sažetak i kviz' });

    await user.click(screen.getByRole('checkbox', { name: 'Kviz' }));
    await user.click(screen.getByRole('checkbox', { name: 'Sažetak' }));

    expect(screen.getByRole('button', { name: 'Napravi' })).toBeDisabled();
  });

  it('asks before making it again over what exists, and cancelling changes nothing', async () => {
    const fake = keepLesson(lessonOf({ status: 'in_review', summary: summaryOf() }));
    const { user } = renderApp({ path: LESSON_PATH });

    await user.click(await screen.findByRole('button', { name: 'Napravi sažetak i kviz' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Napraviti ponovo?' });
    expect(dialog).toHaveTextContent('tvoje ručne izmjene u njemu se gube');
    await user.click(within(dialog).getByRole('button', { name: 'Odustani' }));
    expect(fake.sent.generate).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Napravi sažetak i kviz' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Da, napravi ponovo',
      }),
    );
    await waitFor(() => expect(fake.sent.generate).toEqual([{ summary: true, quiz: true }]));
  });

  it('needs a text, and the saved text', async () => {
    keepLesson(lessonOf({ body: '' }));
    renderApp({ path: LESSON_PATH });

    expect(await screen.findByText('Prvo dodaj tekst lekcije.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Napravi sažetak i kviz' })).toBeDisabled();
  });

  it('waits for the text edits to be saved first', async () => {
    keepLesson(lessonOf());
    const { user } = renderApp({ path: LESSON_PATH });

    await user.type(await screen.findByLabelText(/Tekst lekcije/), ' Dodatak.');

    expect(screen.getByText(/Prvo sačuvaj izmjene teksta/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Napravi sažetak i kviz' })).toBeDisabled();
  });

  it('cannot be asked while the lesson is published', async () => {
    keepLesson(lessonOf({ status: 'published', publishedAt: '2026-11-03T10:00:00.000Z' }));
    renderApp({ path: LESSON_PATH });

    expect(await screen.findByText(/ili je AI još radi/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Napravi sažetak i kviz' }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ['The AI service is busy right now. Try again in a minute.', /AI je trenutno zauzet/],
    ['The daily limit of the AI service was reached. Try again tomorrow.', /Dnevno ograničenje/],
    ['The text is too long for the AI service that is set up now.', /Tekst je predug/],
    ['The text is too short to make a quiz.', /Tekst je prekratak za kviz/],
    ['The AI answered in a form that could not be used (x) Try again.', /ne može iskoristiti/],
    ['The work was interrupted. Try again.', /Posao je prekinut/],
    ['Something nobody planned for.', /AI nije uspio da napravi sažetak i kviz/],
  ])('explains in Serbian why a run failed: %s', async (reason, message) => {
    keepLesson(lessonOf({ processingError: reason }));
    renderApp({ path: LESSON_PATH });

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });

  it('tries again after a failure', async () => {
    const fake = keepLesson(lessonOf({ processingError: 'The AI service is busy right now.' }));
    const { user } = renderApp({ path: LESSON_PATH });

    await user.click(await screen.findByRole('button', { name: 'Pokušaj ponovo' }));

    await waitFor(() => expect(fake.sent.generate).toEqual([{ summary: true, quiz: true }]));
    expect(await screen.findByText('AI radi na sažetku i kvizu…')).toBeInTheDocument();
    expect(screen.queryByText(/AI je trenutno zauzet/)).not.toBeInTheDocument();
  });

  it('shows the answer of the server when it refuses to start', async () => {
    const fake = keepLesson(lessonOf());
    fake.failNext('lesson_busy', 409);
    const { user } = renderApp({ path: LESSON_PATH });

    await user.click(await screen.findByRole('button', { name: 'Napravi sažetak i kviz' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('AI trenutno radi na ovoj lekciji');
  });
});

describe('The summary', () => {
  const inReview = () =>
    lessonOf({
      status: 'in_review',
      summary: summaryOf({ points: ['Prva tačka.', 'Druga tačka.', 'Treća tačka.'] }),
    });

  it('shows every point in its own field, with who made it', async () => {
    keepLesson(inReview());
    renderApp({ path: LESSON_PATH });

    expect(await screen.findByLabelText('Tačka 1')).toHaveValue('Prva tačka.');
    expect(screen.getByLabelText('Tačka 2')).toHaveValue('Druga tačka.');
    expect(screen.getByLabelText('Tačka 3')).toHaveValue('Treća tačka.');
    expect(screen.getByText('Napravio AI, čeka odobrenje')).toBeInTheDocument();
    expect(screen.getAllByText('12 od 300 znakova')).not.toHaveLength(0);
  });

  it('saves the whole list after an edit, and says so', async () => {
    const fake = keepLesson(inReview());
    const { user } = renderApp({ path: LESSON_PATH });
    const first = await screen.findByLabelText('Tačka 1');
    expect(screen.getByRole('button', { name: 'Sačuvaj' })).toBeDisabled();

    await user.clear(first);
    await user.type(first, '  Nova prva tačka.  ');
    await user.click(screen.getByRole('button', { name: 'Sačuvaj' }));

    expect(await screen.findByText('Sažetak je sačuvan.')).toBeInTheDocument();
    expect(fake.sent.summary).toEqual([['Nova prva tačka.', 'Druga tačka.', 'Treća tačka.']]);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sačuvaj' })).toBeDisabled());
    expect(screen.getByLabelText('Tačka 1')).toHaveValue('Nova prva tačka.');
  });

  it('adds, moves and removes points, and sends the list as it looks', async () => {
    const fake = keepLesson(inReview());
    const { user } = renderApp({ path: LESSON_PATH });
    await screen.findByLabelText('Tačka 1');

    await user.click(screen.getByRole('button', { name: 'Pomjeri tačku 3 gore' }));
    await user.click(screen.getByRole('button', { name: 'Ukloni tačku 1' }));
    await user.click(screen.getByRole('button', { name: 'Dodaj tačku' }));
    await user.type(screen.getByLabelText('Tačka 3'), 'Četvrta tačka.');
    await user.click(screen.getByRole('button', { name: 'Sačuvaj' }));

    await waitFor(() =>
      expect(fake.sent.summary).toEqual([['Treća tačka.', 'Druga tačka.', 'Četvrta tačka.']]),
    );
  });

  it('cannot move the first point up or the last point down', async () => {
    keepLesson(inReview());
    renderApp({ path: LESSON_PATH });
    await screen.findByLabelText('Tačka 1');

    expect(screen.getByRole('button', { name: 'Pomjeri tačku 1 gore' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Pomjeri tačku 3 dolje' })).toBeDisabled();
  });

  it('refuses an empty point, a long one, and a summary without points', async () => {
    const fake = keepLesson(inReview());
    const { user } = renderApp({ path: LESSON_PATH });
    const first = await screen.findByLabelText('Tačka 1');

    await user.clear(first);
    await user.click(screen.getByRole('button', { name: 'Sačuvaj' }));
    expect(await screen.findByText('Napiši tačku ili je ukloni.')).toBeInTheDocument();

    fireEvent.change(first, { target: { value: 'x'.repeat(301) } });
    await user.click(screen.getByRole('button', { name: 'Sačuvaj' }));
    expect(await screen.findByText('Tačka može imati najviše 300 znakova.')).toBeInTheDocument();

    for (const n of [3, 2, 1]) {
      await user.click(screen.getByRole('button', { name: `Ukloni tačku ${n}` }));
    }
    await user.click(screen.getByRole('button', { name: 'Sačuvaj' }));
    expect(await screen.findByText('Sažetak mora imati bar jednu tačku.')).toBeInTheDocument();
    expect(fake.sent.summary).toEqual([]);
  });

  it('stops adding at 30 points', async () => {
    keepLesson(
      lessonOf({
        status: 'in_review',
        summary: summaryOf({
          points: Array.from({ length: 30 }, (_, i) => `Tačka broj ${i + 1}.`),
        }),
      }),
    );
    renderApp({ path: LESSON_PATH });

    expect(await screen.findByRole('button', { name: 'Dodaj tačku' })).toBeDisabled();
  });

  it('shows the message of the server in Serbian when it refuses the summary', async () => {
    const fake = keepLesson(inReview());
    fake.failNext('invalid_summary', 400);
    const { user } = renderApp({ path: LESSON_PATH });
    const first = await screen.findByLabelText('Tačka 1');

    await user.type(first, ' izmjena');
    await user.click(screen.getByRole('button', { name: 'Sačuvaj' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Sažetak nije ispravan');
    expect(first).toHaveValue('Prva tačka. izmjena');
  });

  describe('approving', () => {
    it('approves what is saved, and then shows it as approved', async () => {
      const fake = keepLesson(inReview());
      const { user } = renderApp({ path: LESSON_PATH });

      await user.click(await screen.findByRole('button', { name: 'Odobri sažetak' }));

      expect(await screen.findByText('Sažetak je odobren.')).toBeInTheDocument();
      expect(fake.sent.approved).toEqual(['summary']);
      expect(await screen.findByText('Odobren')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Odobri sažetak' })).toBeDisabled();
    });

    it('asks to save the edits first', async () => {
      keepLesson(inReview());
      const { user } = renderApp({ path: LESSON_PATH });

      await user.type(await screen.findByLabelText('Tačka 1'), ' izmjena');

      expect(screen.getByRole('button', { name: 'Odobri sažetak' })).toBeDisabled();
      expect(screen.getByText('Prvo sačuvaj izmjene, pa odobri.')).toBeInTheDocument();
    });

    it('warns when the text changed, and approving again confirms that it still fits', async () => {
      keepLesson(
        lessonOf({
          status: 'in_review',
          summary: summaryOf({ status: 'approved', outdated: true }),
        }),
      );
      const { user } = renderApp({ path: LESSON_PATH });

      expect(
        await screen.findByText(/Tekst lekcije se promijenio poslije izrade/),
      ).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Odobri sažetak' }));

      await waitFor(() =>
        expect(
          screen.queryByText(/Tekst lekcije se promijenio poslije izrade/),
        ).not.toBeInTheDocument(),
      );
    });

    it('blocks leaving, and publishing, while there are unsaved edits', async () => {
      keepLesson(inReview());
      const { user, router } = renderApp({ path: LESSON_PATH });

      await user.type(await screen.findByLabelText('Tačka 1'), ' izmjena');

      expect(screen.getByRole('button', { name: 'Objavi' })).toBeDisabled();
      await user.click(screen.getByRole('link', { name: /Biologija · Odjeljenje 5-2/ }));
      const dialog = await screen.findByRole('alertdialog', { name: 'Napustiti stranicu?' });
      await user.click(within(dialog).getByRole('button', { name: 'Ostani' }));
      expect(router.state.location.pathname).toBe(LESSON_PATH);
    });
  });

  describe('deleting and writing by hand', () => {
    it('deletes the summary after a question, and offers to write one', async () => {
      server.use(
        http.get('*/api/subjects/mine', () =>
          HttpResponse.json({ subjects: [], schoolYear: 2026 }),
        ),
      );
      keepLesson(inReview());
      const { user } = renderApp({ path: LESSON_PATH });

      await user.click(await screen.findByRole('button', { name: 'Obriši sažetak' }));
      await user.click(
        within(await screen.findByRole('alertdialog', { name: 'Obrisati sažetak?' })).getByRole(
          'button',
          { name: 'Da, obriši' },
        ),
      );

      expect(await screen.findByText('Sažetak je obrisan.')).toBeInTheDocument();
      expect(screen.getByText('Za ovu lekciju još nema sažetka.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Napiši sažetak sam/a' })).toBeInTheDocument();
    });

    it('writes a summary from nothing: a draft of the teacher, then approved', async () => {
      const fake = keepLesson(lessonOf());
      const { user } = renderApp({ path: LESSON_PATH });

      await user.click(await screen.findByRole('button', { name: 'Napiši sažetak sam/a' }));
      await user.type(screen.getByLabelText('Tačka 1'), 'Moja prva tačka.');
      await user.click(screen.getByRole('button', { name: 'Sačuvaj' }));

      expect(await screen.findByText('Nacrt, čeka odobrenje')).toBeInTheDocument();
      expect(fake.sent.summary).toEqual([['Moja prva tačka.']]);
      await user.click(screen.getByRole('button', { name: 'Odobri sažetak' }));
      expect(await screen.findByText('Odobren')).toBeInTheDocument();
    });
  });

  it('shows a published summary as a plain list, without fields', async () => {
    keepLesson(
      lessonOf({
        status: 'published',
        publishedAt: '2026-11-03T10:00:00.000Z',
        summary: summaryOf({ status: 'approved' }),
      }),
    );
    renderApp({ path: LESSON_PATH });

    expect(await screen.findByText('Biljke prave hranu.', { selector: 'li' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Tačka 1')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Odobri sažetak' })).not.toBeInTheDocument();
  });
});

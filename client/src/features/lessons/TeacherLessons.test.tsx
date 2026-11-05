import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { Lesson } from '@/features/lessons/api/lessonsApi';
import { apiError } from '@/test/authFixtures';
import { biology5b, lessonOf, math5a } from '@/test/lessonApiFixtures';
import { renderApp } from '@/test/renderApp';
import { server } from '@/test/server';

const LESSON_ID = '30000000-0000-4000-8000-000000000001';
const LESSON_PATH = `/teacher/lessons/${LESSON_ID}`;

function answerSubjects() {
  server.use(
    http.get('*/api/subjects/mine', () =>
      HttpResponse.json({ subjects: [biology5b, math5a], schoolYear: 2026 }),
    ),
    http.get('*/api/lessons', () => HttpResponse.json({ lessons: [], total: 0 })),
  );
}

/** A lesson the fake server keeps in memory, so a save is visible in the next answer. */
function keepLesson(initial: Lesson) {
  const state = { lesson: initial, sent: [] as unknown[] };
  server.use(
    http.get('*/api/lessons/:id', () => HttpResponse.json({ lesson: state.lesson })),
    http.patch('*/api/lessons/:id', async ({ request }) => {
      const changes = (await request.json()) as Partial<Lesson>;
      state.sent.push(changes);
      state.lesson = { ...state.lesson, ...changes, updatedAt: '2026-11-05T10:00:00.000Z' };
      return HttpResponse.json({ lesson: state.lesson });
    }),
  );
  return state;
}

describe('Adding a lesson', () => {
  it('asks for a title and a text, and keeps the subject that was chosen', async () => {
    answerSubjects();
    const { user } = renderApp({ path: `/teacher/lessons/new?subject=${biology5b.id}` });

    expect(await screen.findByRole('radio', { name: /Biologija/ })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Dodaj lekciju' }));

    expect(await screen.findByText('Unesi naslov lekcije.')).toBeInTheDocument();
    expect(screen.getByText('Unesi tekst lekcije.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Naslov/)).toHaveAccessibleDescription('Unesi naslov lekcije.');
  });

  it('counts the characters of the text', async () => {
    answerSubjects();
    const { user } = renderApp({ path: '/teacher/lessons/new' });

    await user.type(await screen.findByLabelText(/Tekst lekcije/), 'Voda teče.');

    expect(screen.getByText('10 od 40.000 znakova')).toBeInTheDocument();
  });

  it('refuses a text that is too long', async () => {
    answerSubjects();
    const { user } = renderApp({ path: `/teacher/lessons/new?subject=${biology5b.id}` });
    await user.type(await screen.findByLabelText(/Naslov/), 'Duga lekcija');
    fireEvent.change(screen.getByLabelText(/Tekst lekcije/), {
      target: { value: 'a'.repeat(40001) },
    });

    await user.click(screen.getByRole('button', { name: 'Dodaj lekciju' }));

    expect(await screen.findByText('Tekst može imati najviše 40.000 znakova.')).toBeInTheDocument();
  });

  it('creates the lesson from pasted text and opens it', async () => {
    answerSubjects();
    let sent: unknown;
    server.use(
      http.post('*/api/lessons', async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ lesson: lessonOf() }, { status: 201 });
      }),
    );
    keepLesson(lessonOf());
    const { user, router } = renderApp({ path: `/teacher/lessons/new?subject=${biology5b.id}` });

    await user.type(await screen.findByLabelText(/Naslov/), '  Fotosinteza ');
    await user.type(screen.getByLabelText(/Tekst lekcije/), 'Biljke prave hranu.');
    await user.click(screen.getByRole('button', { name: 'Dodaj lekciju' }));

    await waitFor(() => expect(router.state.location.pathname).toBe(LESSON_PATH));
    expect(sent).toEqual({
      subjectId: biology5b.id,
      title: 'Fotosinteza',
      body: 'Biljke prave hranu.',
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Fotosinteza' }),
    ).toBeInTheDocument();
  });

  it('keeps what was typed and explains when the server refuses', async () => {
    answerSubjects();
    server.use(
      http.post('*/api/lessons', () =>
        HttpResponse.json(apiError('invalid_subject'), { status: 400 }),
      ),
    );
    const { user, router } = renderApp({ path: `/teacher/lessons/new?subject=${biology5b.id}` });

    await user.type(await screen.findByLabelText(/Naslov/), 'Fotosinteza');
    await user.type(screen.getByLabelText(/Tekst lekcije/), 'Biljke prave hranu.');
    await user.click(screen.getByRole('button', { name: 'Dodaj lekciju' }));

    expect(await screen.findByText('Izaberi predmet koji predaješ.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Naslov/)).toHaveValue('Fotosinteza');
    expect(screen.getByLabelText(/Tekst lekcije/)).toHaveValue('Biljke prave hranu.');
    expect(router.state.location.pathname).toBe('/teacher/lessons/new');
    expect(screen.getByRole('button', { name: 'Dodaj lekciju' })).toBeEnabled();
  });

  describe('from a file', () => {
    async function openFileTab(path = `/teacher/lessons/new?subject=${biology5b.id}`) {
      answerSubjects();
      const result = renderApp({ path });
      await result.user.click(await screen.findByRole('tab', { name: 'Iz fajla' }));
      await result.user.type(screen.getByLabelText(/Naslov/), 'Iz dokumenta');
      return result;
    }

    it('refuses an old Word file and an unknown type before sending anything', async () => {
      const { user } = await openFileTab();
      const input = screen.getByLabelText(/Word \(\.docx\) ili PDF/);

      fireEvent.change(input, { target: { files: [new File(['x'], 'stari.doc')] } });
      expect(await screen.findByText(/Stari Word fajl \(\.doc\) nije podržan/)).toBeInTheDocument();

      fireEvent.change(input, { target: { files: [new File(['x'], 'slika.png')] } });
      expect(
        await screen.findByText('Podržani su samo Word (.docx) i PDF fajlovi.'),
      ).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Dodaj lekciju' }));
      expect(screen.getByText('Podržani su samo Word (.docx) i PDF fajlovi.')).toBeInTheDocument();
    });

    it('refuses a file over 10 MB', async () => {
      await openFileTab();
      const big = new File(['x'], 'veliki.pdf');
      Object.defineProperty(big, 'size', { value: 10 * 1024 * 1024 + 1 });

      fireEvent.change(screen.getByLabelText(/Word \(\.docx\) ili PDF/), {
        target: { files: [big] },
      });

      expect(await screen.findByText('Fajl je veći od 10 MB.')).toBeInTheDocument();
    });

    it('asks for a file when none is chosen', async () => {
      const { user } = await openFileTab();
      await user.click(screen.getByRole('button', { name: 'Dodaj lekciju' }));
      expect(await screen.findByText('Izaberi fajl.')).toBeInTheDocument();
    });

    it('creates an empty lesson, sends the file as the body and shows the note about pictures', async () => {
      const filled = lessonOf({
        body: 'Tekst iz dokumenta.',
        source: 'pdf',
        sourceFileName: 'sat.pdf',
      });
      let created: unknown;
      let upload: { name: string | null; size: number; type: string | null } | undefined;
      server.use(
        http.post('*/api/lessons', async ({ request }) => {
          created = await request.json();
          return HttpResponse.json({ lesson: lessonOf({ body: '' }) }, { status: 201 });
        }),
        http.post('*/api/lessons/:id/source', async ({ request }) => {
          upload = {
            name: request.headers.get('x-file-name'),
            size: (await request.arrayBuffer()).byteLength,
            type: request.headers.get('content-type'),
          };
          return HttpResponse.json({
            lesson: filled,
            warnings: [{ code: 'images_not_included', count: 46 }],
          });
        }),
      );
      keepLesson(filled);
      const { user, router } = await openFileTab();

      await user.upload(
        screen.getByLabelText(/Word \(\.docx\) ili PDF/),
        new File(['%PDF-1.4 tekst'], 'čas 1.pdf', { type: 'application/pdf' }),
      );
      expect(screen.getByText('Izabrano: čas 1.pdf')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Dodaj lekciju' }));

      await waitFor(() => expect(router.state.location.pathname).toBe(LESSON_PATH));
      // No text was sent with the title; the file came as it is, with its name in a header.
      expect(created).toEqual({ subjectId: biology5b.id, title: 'Iz dokumenta' });
      expect(upload).toEqual({
        name: encodeURIComponent('čas 1.pdf'),
        size: '%PDF-1.4 tekst'.length,
        type: 'application/pdf',
      });
      expect(await screen.findByText(/Tekst je učitan iz fajla/)).toBeInTheDocument();
      expect(
        screen.getByText(/Dokument ima 46 slika koje nisu uključene u tekst/),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/Tekst lekcije/)).toHaveValue('Tekst iz dokumenta.');
    });

    it('opens the lesson with an explanation when the file cannot be read', async () => {
      server.use(
        http.post('*/api/lessons', () =>
          HttpResponse.json({ lesson: lessonOf({ body: '' }) }, { status: 201 }),
        ),
        http.post('*/api/lessons/:id/source', () =>
          HttpResponse.json(apiError('no_text_in_file'), { status: 422 }),
        ),
      );
      keepLesson(lessonOf({ body: '' }));
      const { user, router } = await openFileTab();

      await user.upload(
        screen.getByLabelText(/Word \(\.docx\) ili PDF/),
        new File(['%PDF'], 'sken.pdf', { type: 'application/pdf' }),
      );
      await user.click(screen.getByRole('button', { name: 'Dodaj lekciju' }));

      await waitFor(() => expect(router.state.location.pathname).toBe(LESSON_PATH));
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Lekcija je napravljena, ali tekst iz fajla nije učitan',
      );
    });
  });
});

describe('A lesson', () => {
  it('shows the title, the state, where the text came from and the text', async () => {
    keepLesson(lessonOf({ source: 'docx', sourceFileName: 'sat.docx' }));
    renderApp({ path: LESSON_PATH });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Fotosinteza' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Nacrt')).toBeInTheDocument();
    expect(screen.getByText('Word fajl: sat.docx')).toBeInTheDocument();
    expect(screen.getByLabelText(/Tekst lekcije/)).toHaveValue(
      'Biljke prave hranu uz pomoć svjetlosti.\n\nTo se zove fotosinteza.',
    );
    expect(screen.getByRole('link', { name: /Biologija · Odjeljenje 5-2/ })).toHaveAttribute(
      'href',
      `/teacher/subjects/${biology5b.id}`,
    );
    expect(screen.getByText('Za ovu lekciju još nema sažetka.')).toBeInTheDocument();
  });

  it('says it does not exist when the server says so', async () => {
    server.use(
      http.get('*/api/lessons/:id', () =>
        HttpResponse.json(apiError('not_found'), { status: 404 }),
      ),
    );
    renderApp({ path: LESSON_PATH });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Lekcija nije pronađena' }),
    ).toBeInTheDocument();
  });

  it('offers a retry when the lesson cannot be loaded', async () => {
    server.use(
      http.get('*/api/lessons/:id', () =>
        HttpResponse.json(apiError('internal_error'), { status: 500 }),
      ),
    );
    renderApp({ path: LESSON_PATH });

    expect(await screen.findByRole('alert')).toHaveTextContent('Nije moguće učitati podatke');
  });

  describe('editing', () => {
    it('saves a changed text and title, and says so', async () => {
      const server_ = keepLesson(lessonOf());
      const { user } = renderApp({ path: LESSON_PATH });
      const body = await screen.findByLabelText(/Tekst lekcije/);
      expect(screen.getByRole('button', { name: 'Sačuvaj izmjene' })).toBeDisabled();

      await user.clear(body);
      await user.type(body, 'Novi tekst.');
      await user.click(screen.getByRole('button', { name: 'Sačuvaj izmjene' }));

      expect(await screen.findByText('Izmjene su sačuvane.')).toBeInTheDocument();
      expect(server_.sent).toEqual([{ title: 'Fotosinteza', body: 'Novi tekst.' }]);
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Sačuvaj izmjene' })).toBeDisabled(),
      );
      expect(screen.queryByText('Imaš nesačuvane izmjene.')).not.toBeInTheDocument();
    });

    it('refuses an empty title', async () => {
      keepLesson(lessonOf());
      const { user } = renderApp({ path: LESSON_PATH });
      const title = await screen.findByLabelText(/Naslov/);

      await user.clear(title);
      await user.click(screen.getByRole('button', { name: 'Sačuvaj izmjene' }));

      expect(await screen.findByText('Unesi naslov lekcije.')).toBeInTheDocument();
    });

    it('shows the message of the server when saving fails and keeps the edits', async () => {
      keepLesson(lessonOf());
      server.use(
        http.patch('*/api/lessons/:id', () =>
          HttpResponse.json(apiError('lesson_busy'), { status: 409 }),
        ),
      );
      const { user } = renderApp({ path: LESSON_PATH });
      const body = await screen.findByLabelText(/Tekst lekcije/);

      await user.type(body, ' Dodatak.');
      await user.click(screen.getByRole('button', { name: 'Sačuvaj izmjene' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'AI trenutno radi na ovoj lekciji',
      );
      expect(body).toHaveValue(
        'Biljke prave hranu uz pomoć svjetlosti.\n\nTo se zove fotosinteza. Dodatak.',
      );
    });

    it('asks before leaving with unsaved changes, and lets the teacher stay or go', async () => {
      keepLesson(lessonOf());
      answerSubjects();
      const { user, router } = renderApp({ path: LESSON_PATH });
      await user.type(await screen.findByLabelText(/Tekst lekcije/), ' Dodatak.');

      await user.click(screen.getByRole('link', { name: /Biologija · Odjeljenje 5-2/ }));
      const dialog = await screen.findByRole('alertdialog', { name: 'Napustiti stranicu?' });
      await user.click(within(dialog).getByRole('button', { name: 'Ostani' }));
      expect(router.state.location.pathname).toBe(LESSON_PATH);

      await user.click(screen.getByRole('link', { name: /Biologija · Odjeljenje 5-2/ }));
      await user.click(
        within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Napusti' }),
      );
      await waitFor(() =>
        expect(router.state.location.pathname).toBe(`/teacher/subjects/${biology5b.id}`),
      );
    });

    it('does not ask when nothing was changed', async () => {
      keepLesson(lessonOf());
      answerSubjects();
      const { user, router } = renderApp({ path: LESSON_PATH });
      await screen.findByLabelText(/Tekst lekcije/);

      await user.click(screen.getByRole('link', { name: /Biologija · Odjeljenje 5-2/ }));

      await waitFor(() =>
        expect(router.state.location.pathname).toBe(`/teacher/subjects/${biology5b.id}`),
      );
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  describe('replacing the text from a file', () => {
    async function replaceWith(file: File, answer: () => Response) {
      keepLesson(lessonOf());
      server.use(http.post('*/api/lessons/:id/source', answer));
      const result = renderApp({ path: LESSON_PATH });
      await result.user.click(
        await screen.findByRole('button', { name: 'Zamijeni tekst iz fajla' }),
      );
      await result.user.click(
        within(await screen.findByRole('alertdialog', { name: 'Zamijeniti tekst?' })).getByRole(
          'button',
          { name: 'Izaberi fajl' },
        ),
      );
      fireEvent.change(screen.getByLabelText('Zamijeni tekst iz fajla', { selector: 'input' }), {
        target: { files: [file] },
      });
      return result;
    }

    it('shows the new text for correction, with the note about pictures', async () => {
      const filled = lessonOf({
        body: 'Novi tekst iz Worda.',
        source: 'docx',
        sourceFileName: 'novi.docx',
      });
      await replaceWith(
        new File(['PK'], 'novi.docx'),
        () =>
          HttpResponse.json({
            lesson: filled,
            warnings: [{ code: 'images_not_included', count: 1 }],
          }) as unknown as Response,
      );

      expect(await screen.findByText(/Tekst je učitan iz fajla/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Tekst lekcije/)).toHaveValue('Novi tekst iz Worda.');
      expect(
        screen.getByText(/Dokument ima 1 sliku koja nije uključena u tekst/),
      ).toBeInTheDocument();
    });

    it('explains an unsupported file without changing the text', async () => {
      await replaceWith(
        new File(['x'], 'zip.docx'),
        () =>
          HttpResponse.json(apiError('unsupported_file'), { status: 415 }) as unknown as Response,
      );

      expect(await screen.findByRole('alert')).toHaveTextContent('Ovaj fajl nije podržan');
      expect(screen.getByLabelText(/Tekst lekcije/)).toHaveValue(
        'Biljke prave hranu uz pomoć svjetlosti.\n\nTo se zove fotosinteza.',
      );
    });
  });

  describe('publishing', () => {
    it('publishes and shows the lesson as published and read only', async () => {
      const state = keepLesson(lessonOf());
      server.use(
        http.post('*/api/lessons/:id/publish', () => {
          state.lesson = {
            ...state.lesson,
            status: 'published',
            publishedAt: '2026-11-05T10:00:00.000Z',
          };
          return HttpResponse.json({ lesson: state.lesson });
        }),
      );
      const { user } = renderApp({ path: LESSON_PATH });

      await user.click(await screen.findByRole('button', { name: 'Objavi' }));

      expect(await screen.findByText(/Objavljena 5\. novembar 2026\./)).toBeInTheDocument();
      expect(screen.getByText(/ne može se mijenjati/)).toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.getByText(/To se zove fotosinteza\./)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Vrati u nacrt' })).toBeInTheDocument();
    });

    it.each([
      ['needs_approval', /još nije odobren/],
      ['lesson_has_no_text', /nema tekst/],
      ['content_outdated', /Tekst se promijenio poslije izrade/],
    ])('explains why %s stops the publishing', async (code, message) => {
      keepLesson(lessonOf());
      server.use(
        http.post('*/api/lessons/:id/publish', () =>
          HttpResponse.json(apiError(code), { status: 409 }),
        ),
      );
      const { user } = renderApp({ path: LESSON_PATH });

      await user.click(await screen.findByRole('button', { name: 'Objavi' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(screen.getByText('Nacrt')).toBeInTheDocument();
    });

    it('does not publish what has not been saved', async () => {
      keepLesson(lessonOf());
      const { user } = renderApp({ path: LESSON_PATH });

      await user.type(await screen.findByLabelText(/Tekst lekcije/), ' Dodatak.');

      expect(screen.getByRole('button', { name: 'Objavi' })).toBeDisabled();
    });

    it('takes a published lesson back to a draft, which can be edited again', async () => {
      const state = keepLesson(
        lessonOf({ status: 'published', publishedAt: '2026-11-03T10:00:00.000Z' }),
      );
      server.use(
        http.post('*/api/lessons/:id/unpublish', () => {
          state.lesson = { ...state.lesson, status: 'draft', publishedAt: null };
          return HttpResponse.json({ lesson: state.lesson });
        }),
      );
      const { user } = renderApp({ path: LESSON_PATH });

      await user.click(await screen.findByRole('button', { name: 'Vrati u nacrt' }));

      expect(await screen.findByLabelText(/Tekst lekcije/)).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Objavi' })).toBeInTheDocument();
    });
  });

  describe('deleting', () => {
    it('asks first, then deletes the draft and returns to the subject', async () => {
      keepLesson(lessonOf());
      answerSubjects();
      let deleted = false;
      server.use(
        http.delete('*/api/lessons/:id', () => {
          deleted = true;
          return new HttpResponse(null, { status: 204 });
        }),
      );
      const { user, router } = renderApp({ path: LESSON_PATH });

      await user.click(await screen.findByRole('button', { name: 'Obriši lekciju' }));
      expect(deleted).toBe(false);
      const dialog = await screen.findByRole('alertdialog', { name: 'Obrisati lekciju?' });
      await user.click(within(dialog).getByRole('button', { name: 'Da, obriši' }));

      await waitFor(() =>
        expect(router.state.location.pathname).toBe(`/teacher/subjects/${biology5b.id}`),
      );
      expect(deleted).toBe(true);
    });

    it('cancelling keeps the lesson', async () => {
      keepLesson(lessonOf());
      const { user, router } = renderApp({ path: LESSON_PATH });

      await user.click(await screen.findByRole('button', { name: 'Obriši lekciju' }));
      await user.click(
        within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Odustani' }),
      );

      expect(router.state.location.pathname).toBe(LESSON_PATH);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('cannot delete a published lesson', async () => {
      keepLesson(lessonOf({ status: 'published', publishedAt: '2026-11-03T10:00:00.000Z' }));
      renderApp({ path: LESSON_PATH });

      await screen.findByRole('button', { name: 'Vrati u nacrt' });
      expect(screen.queryByRole('button', { name: 'Obriši lekciju' })).not.toBeInTheDocument();
    });
  });

  describe('while the AI works', () => {
    it('shows that it works, blocks editing, and updates by itself when it is done', async () => {
      let asked = 0;
      server.use(
        http.get('*/api/lessons/:id', () => {
          asked += 1;
          return HttpResponse.json({
            lesson: lessonOf(asked === 1 ? { status: 'processing' } : { status: 'in_review' }),
          });
        }),
      );
      renderApp({ path: LESSON_PATH });

      expect(await screen.findByText('AI radi na sažetku i kvizu…')).toBeInTheDocument();
      expect(screen.getByLabelText(/Tekst lekcije/)).toHaveAttribute('readonly');
      expect(screen.getByRole('button', { name: 'Objavi' })).toBeDisabled();

      // The page asks again every 2.5 seconds, without being touched.
      await waitFor(
        () => expect(screen.queryByText(/AI radi na sažetku/)).not.toBeInTheDocument(),
        {
          timeout: 4500,
        },
      );
      expect(screen.getByText('Čeka pregled')).toBeInTheDocument();
      expect(screen.getByLabelText(/Tekst lekcije/)).not.toHaveAttribute('readonly');
    }, 10000);
  });
});

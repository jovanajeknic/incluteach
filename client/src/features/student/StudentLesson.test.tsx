import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiError } from '@/test/authFixtures';
import { renderApp } from '@/test/renderApp';
import { server } from '@/test/server';
import { stubVoice } from '@/test/speechStub';
import { studentLessonOf } from '@/test/studentApiFixtures';
import type { StudentLesson } from '@/features/student/api/studentApi';

const LESSON_PATH = '/student/lessons/l1';

function answerLesson(lesson: StudentLesson = studentLessonOf()) {
  const asked: string[] = [];
  server.use(
    http.get('*/api/lessons/:id', ({ params }) => {
      asked.push(String(params.id));
      return HttpResponse.json({ lesson });
    }),
  );
  return asked;
}

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('Reading a lesson', () => {
  it('shows the title, the summary and the text, with the line breaks of the teacher', async () => {
    answerLesson(studentLessonOf({ body: 'Prvi red.\nDrugi red.\n\nNovi pasus.' }));
    renderApp({ path: LESSON_PATH });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Fotosinteza' }),
    ).toBeInTheDocument();
    const summary = screen.getByRole('region', { name: 'Ukratko' });
    expect(
      within(summary)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Biljke prave hranu.', 'Za to im treba svjetlost.']);
    const text = screen.getByRole('article', { name: 'Tekst lekcije' });
    const paragraphs = text.querySelectorAll('p');
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]!.textContent).toBe('Prvi red.\nDrugi red.');
    expect(paragraphs[0]).toHaveClass('whitespace-pre-line');
    expect(screen.getByRole('link', { name: /Nazad na predmet: Biologija/ })).toHaveAttribute(
      'href',
      `/student/subjects/${studentLessonOf().subject.id}`,
    );
  });

  it('has no part for the summary when the lesson has none, and says so for an empty text', async () => {
    answerLesson(studentLessonOf({ summary: null, body: '   ', quiz: null }));
    renderApp({ path: LESSON_PATH });

    expect(await screen.findByText('Ova lekcija nema teksta.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Ukratko' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Kviz' })).not.toBeInTheDocument();
  });

  it('offers the quiz only when the lesson has one', async () => {
    answerLesson();
    renderApp({ path: LESSON_PATH });

    expect(await screen.findByRole('link', { name: 'Kreni na kviz' })).toHaveAttribute(
      'href',
      '/student/lessons/l1/quiz',
    );
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
    let calls = 0;
    server.use(
      http.get('*/api/lessons/:id', () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(apiError('internal_error'), { status: 500 })
          : HttpResponse.json({ lesson: studentLessonOf() });
      }),
    );
    const { user } = renderApp({ path: LESSON_PATH });

    await user.click(await screen.findByRole('button', { name: 'Pokušaj ponovo' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Fotosinteza' }),
    ).toBeInTheDocument();
  });

  it('never mentions a diagnosis', async () => {
    answerLesson();
    renderApp({ path: LESSON_PATH });
    await screen.findByRole('heading', { level: 1, name: 'Fotosinteza' });

    expect(document.body.textContent?.toLowerCase()).not.toMatch(
      /disleksij|adhd|poremećaj|dijagnoz/,
    );
  });
});

describe('Latin and Cyrillic', () => {
  const group = () => screen.getByRole('group', { name: 'Pismo teksta' });

  it('starts in Latin, and shows the title, the summary and the text in Cyrillic on a click', async () => {
    answerLesson();
    const { user } = renderApp({ path: LESSON_PATH });
    await screen.findByRole('heading', { level: 1, name: 'Fotosinteza' });
    expect(within(group()).getByRole('button', { name: 'Latinica' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(within(group()).getByRole('button', { name: 'Ćirilica' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Фотосинтеза' })).toBeInTheDocument();
    expect(screen.getByText('Биљке праве храну.')).toBeInTheDocument();
    expect(screen.getByText(/Љубав према њиви је велика!/)).toBeInTheDocument();
    expect(within(group()).getByRole('button', { name: 'Ćirilica' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(within(group()).getByRole('button', { name: 'Latinica' }));
    expect(screen.getByText('Biljke prave hranu.')).toBeInTheDocument();
  });

  it('shows a lesson written in Cyrillic in Latin, and keeps its Latin words in Cyrillic', async () => {
    answerLesson(
      studentLessonOf({
        title: 'Музика',
        body: 'Музика на Spotify платформи.',
        summary: { points: ['Љубав према музици.'] },
      }),
    );
    const { user } = renderApp({ path: LESSON_PATH });

    expect(await screen.findByRole('heading', { level: 1, name: 'Muzika' })).toBeInTheDocument();
    expect(screen.getByText('Muzika na Spotify platformi.')).toBeInTheDocument();
    expect(screen.getByText('Ljubav prema muzici.')).toBeInTheDocument();

    await user.click(within(group()).getByRole('button', { name: 'Ćirilica' }));
    expect(screen.getByText('Музика на Spotify платформи.')).toBeInTheDocument();
  });

  it('remembers the script on this device, for this person, and sends nothing to the server', async () => {
    const asked = answerLesson();
    const { user, unmount } = renderApp({ path: LESSON_PATH });
    await user.click(
      await within(await screen.findByRole('group', { name: 'Pismo teksta' })).findByRole(
        'button',
        { name: 'Ćirilica' },
      ),
    );
    expect(
      JSON.parse(
        window.localStorage.getItem('incluteach.reading.00000000-0000-4000-8000-000000000003')!,
      ).script,
    ).toBe('cyrillic');
    unmount();

    renderApp({ path: LESSON_PATH });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Фотосинтеза' }),
    ).toBeInTheDocument();
    // Only the lesson was asked for; the choice never leaves the browser.
    expect(new Set(asked)).toEqual(new Set(['l1']));
  });
});

describe('Reading settings', () => {
  it('changes the look of the text, remembers it on this device, and can be reset', async () => {
    answerLesson();
    const { user } = renderApp({ path: LESSON_PATH });
    await user.click(await screen.findByRole('button', { name: 'Slova i boje' }));
    const panel = screen.getByRole('region', { name: 'Slova i boje' });
    const text = () => screen.getByRole('article', { name: 'Tekst lekcije' }).querySelector('div')!;

    await user.click(within(panel).getByLabelText('Najveća'));
    await user.click(within(panel).getByLabelText('Za lakše čitanje'));

    expect(text().className).toContain('text-2xl');
    expect(text().className).toContain('font-dyslexic');
    const stored = JSON.parse(
      window.localStorage.getItem('incluteach.reading.00000000-0000-4000-8000-000000000003')!,
    );
    expect(stored).toMatchObject({ size: 'xl', font: 'dyslexic', script: 'latin' });

    await user.click(within(panel).getByRole('button', { name: 'Vrati početna podešavanja' }));
    expect(text().className).toContain('text-lg');
    expect(text().className).not.toContain('font-dyslexic');
  });

  it('offers the script among the settings too', async () => {
    answerLesson();
    const { user } = renderApp({ path: LESSON_PATH });
    await user.click(await screen.findByRole('button', { name: 'Slova i boje' }));

    await user.click(
      within(screen.getByRole('region', { name: 'Slova i boje' })).getByLabelText('Ćirilica'),
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Фотосинтеза' })).toBeInTheDocument();
  });

  it('shows the lesson step by step, one paragraph at a time', async () => {
    answerLesson();
    const { user } = renderApp({ path: LESSON_PATH });
    await user.click(await screen.findByRole('button', { name: 'Korak po korak' }));

    expect(screen.getByText('Dio 1 od 2')).toBeInTheDocument();
    const visible = () =>
      screen
        .getByRole('article', { name: 'Tekst lekcije' })
        .querySelectorAll('div:not(.hidden) > p');
    expect(visible()[0]!.textContent).toContain('fotosinteza');
    expect(screen.getByRole('button', { name: /Prethodni dio/ })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Sljedeći dio/ }));
    expect(screen.getByText('Dio 2 od 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sljedeći dio/ })).toBeDisabled();
  });
});

describe('Reading aloud', () => {
  it('reads with the voice of the device and highlights the sentence that is read', async () => {
    const spoken = stubVoice();
    answerLesson();
    const { user } = renderApp({ path: LESSON_PATH });

    await user.click(await screen.findByRole('button', { name: 'Poslušaj lekciju' }));

    expect(spoken).toEqual(['Biljke prave hranu uz pomoć svjetlosti.']);
    const sentence = screen
      .getByRole('article', { name: 'Tekst lekcije' })
      .querySelector('[data-sentence="0"]');
    expect(sentence).toHaveAttribute('data-active', 'true');
    expect(screen.getByRole('button', { name: 'Pauza' })).toBeInTheDocument();
  });

  it('reads Latin script also when the student looks at Cyrillic, and highlights the same sentence', async () => {
    const spoken = stubVoice();
    answerLesson();
    const { user } = renderApp({ path: LESSON_PATH });
    await user.click(
      await within(await screen.findByRole('group', { name: 'Pismo teksta' })).findByRole(
        'button',
        {
          name: 'Ćirilica',
        },
      ),
    );

    await user.click(screen.getByRole('button', { name: 'Poslušaj lekciju' }));

    // The voice gets Latin; the screen keeps Cyrillic, with the same sentence marked.
    expect(spoken).toEqual(['Biljke prave hranu uz pomoć svjetlosti.']);
    const sentence = screen
      .getByRole('article', { name: 'Tekst lekcije' })
      .querySelector('[data-sentence="0"]')!;
    expect(sentence).toHaveAttribute('data-active', 'true');
    expect(sentence.textContent).toBe('Биљке праве храну уз помоћ свјетлости.');
    expect(screen.getByText(/uvijek koristi latinicu/)).toBeInTheDocument();
  });

  it('gives a voice made for Cyrillic the text in Cyrillic, and prefers the natural voice', async () => {
    const spoken = stubVoice({
      voices: [
        { lang: 'sr-RS', name: 'Robot - Serbian (Latin, Serbia)' },
        { lang: 'sr-RS', name: 'Microsoft Софија Online (Natural) - Serbian (Cyrillic, Serbia)' },
      ],
    });
    answerLesson();
    const { user } = renderApp({ path: LESSON_PATH });

    await user.click(await screen.findByRole('button', { name: 'Poslušaj lekciju' }));

    expect(spoken).toEqual(['Биљке праве храну уз помоћ свјетлости.']);
  });

  it('says clearly when the device cannot read aloud', async () => {
    vi.stubGlobal('speechSynthesis', undefined);
    Reflect.deleteProperty(window, 'speechSynthesis');
    answerLesson();
    renderApp({ path: LESSON_PATH });

    expect(await screen.findByText(/ne može da čita naglas/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Poslušaj lekciju' })).not.toBeInTheDocument();
  });
});

describe('Saving the lesson', () => {
  it('opens the print window with the look the student chose, without the menus', async () => {
    const print = vi.fn();
    vi.stubGlobal('print', print);
    answerLesson();
    const { user } = renderApp({ path: LESSON_PATH });

    const button = await screen.findByRole('button', { name: 'Štampaj ili sačuvaj kao PDF' });
    await user.click(button);

    expect(print).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Sačuvaj kao PDF/, { selector: 'p' })).toBeInTheDocument();
    // Everything that is not the lesson is hidden on paper.
    expect(button.closest('.print\\:hidden')).not.toBeNull();
    expect(screen.getByRole('link', { name: /Nazad na predmet/ })).toHaveClass('print:hidden');
    expect(screen.getByRole('link', { name: 'Kreni na kviz' }).closest('section')).toHaveClass(
      'print:hidden',
    );
    expect(
      screen.getByRole('navigation', { name: 'Učenička navigacija' }).closest('aside'),
    ).toHaveClass('print:hidden');
  });

  it('adds who and when only for paper, and prints the whole text also in step-by-step mode', async () => {
    answerLesson();
    const { user } = renderApp({ path: LESSON_PATH });
    await user.click(await screen.findByRole('button', { name: 'Korak po korak' }));

    const paperLine = screen.getByText(/Štampano/);
    expect(paperLine).toHaveClass('hidden', 'print:block');
    expect(paperLine).toHaveTextContent('Biologija · odjeljenje 5-2');
    const paperText = screen
      .getByRole('article', { name: 'Tekst lekcije' })
      .querySelector('div.hidden.print\\:block')!;
    expect(paperText.textContent).toContain('Ljubav prema njivi je velika!');
    expect(paperText.textContent).toContain('fotosinteza');
  });

  describe('as a Word file', () => {
    function stubDownload() {
      const blobs: Blob[] = [];
      vi.stubGlobal(
        'URL',
        Object.assign(URL, {
          createObjectURL: vi.fn((blob: Blob) => {
            blobs.push(blob);
            return 'blob:fake';
          }),
          revokeObjectURL: vi.fn(),
        }),
      );
      const names: string[] = [];
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
        this: HTMLAnchorElement,
      ) {
        names.push(this.download);
      });
      return { blobs, names };
    }

    it('downloads a .docx named after the lesson, and says so', async () => {
      const { blobs, names } = stubDownload();
      answerLesson();
      const { user } = renderApp({ path: LESSON_PATH });

      await user.click(await screen.findByRole('button', { name: 'Preuzmi Word' }));

      expect(await screen.findByText('Word fajl je preuzet.')).toBeInTheDocument();
      expect(names).toEqual(['Fotosinteza.docx']);
      expect(blobs).toHaveLength(1);
      expect(blobs[0]!.type).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      expect(blobs[0]!.size).toBeGreaterThan(1000);
    });

    it('shows that it works, and says when the file could not be made', async () => {
      stubDownload();
      vi.stubGlobal(
        'URL',
        Object.assign(URL, {
          createObjectURL: vi.fn(() => {
            throw new Error('no');
          }),
          revokeObjectURL: vi.fn(),
        }),
      );
      answerLesson();
      const { user } = renderApp({ path: LESSON_PATH });

      await user.click(await screen.findByRole('button', { name: 'Preuzmi Word' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Fajl nije mogao da se napravi');
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Preuzmi Word' })).toBeEnabled(),
      );
    });
  });
});

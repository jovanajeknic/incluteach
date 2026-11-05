import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiError } from '@/test/authFixtures';
import { biology5b } from '@/test/lessonApiFixtures';
import { renderApp } from '@/test/renderApp';
import { server } from '@/test/server';
import { progressOf, studentLessonOf } from '@/test/studentApiFixtures';

const ANA = { id: '40000000-0000-4000-8000-000000000001', fullName: 'Ana Marković' };
const PATH = `/parent/children/${ANA.id}/lessons/l1`;
const PARENT_KEY = 'incluteach.reading.00000000-0000-4000-8000-000000000004';
const LESSONS = [
  { id: 'l1', title: 'Fotosinteza' },
  { id: 'l2', title: 'Disanje biljaka' },
];

beforeEach(() => window.localStorage.clear());
afterEach(() => window.localStorage.clear());

const answerOf = (correct: boolean) => ({
  position: 1,
  kind: 'choice' as const,
  prompt: 'Šta biljke prave uz svjetlost?',
  chosenText: correct ? 'Hranu' : 'Vodu',
  correctText: 'Hranu',
  explanation: 'Biljke prave hranu uz pomoć svjetlosti.',
  correct,
});

function openLesson(options: { done?: string[]; tries?: unknown[] } = {}) {
  const asked = { lesson: 0, tries: [] as string[], progress: [] as string[] };
  server.use(
    http.get('*/api/children', () => HttpResponse.json({ children: [ANA] })),
    http.get('*/api/lessons/:id', () => {
      asked.lesson += 1;
      // A parent has no progress of their own in a lesson.
      return HttpResponse.json({ lesson: { ...studentLessonOf(), myProgress: null } });
    }),
    http.get('*/api/subjects/:id/progress', ({ request }) => {
      asked.progress.push(new URL(request.url).searchParams.get('studentId') ?? '');
      return HttpResponse.json(progressOf(options.done ?? [], LESSONS));
    }),
    http.get('*/api/lessons/:id/quiz/attempts', ({ request }) => {
      asked.tries.push(new URL(request.url).searchParams.get('studentId') ?? '');
      return HttpResponse.json({
        student: ANA,
        completedAt: null,
        attempts: options.tries ?? [],
      });
    }),
  );
  return { asked, ...renderApp({ path: PATH }) };
}

describe('A lesson of a child', () => {
  it('reads like the lesson of the child: the title, the summary and the text', async () => {
    openLesson();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Fotosinteza' }),
    ).toBeInTheDocument();
    const summary = screen.getByRole('region', { name: 'Ukratko' });
    expect(within(summary).getByText('Biljke prave hranu.')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Tekst lekcije' })).toHaveTextContent(
      'Biljke prave hranu uz pomoć svjetlosti.',
    );
    expect(screen.getByRole('link', { name: /Nazad na predmet: Biologija/ })).toHaveAttribute(
      'href',
      `/parent/children/${ANA.id}/subjects/${biology5b.id}`,
    );
  });

  it('has the tools of the reader: the script, the settings, reading aloud, printing and Word', async () => {
    openLesson();
    await screen.findByRole('heading', { level: 1, name: 'Fotosinteza' });

    expect(screen.getByRole('group', { name: 'Pismo teksta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Slova i boje' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Štampaj ili sačuvaj kao PDF' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preuzmi Word' })).toBeInTheDocument();
  });

  it('shows the lesson in Cyrillic with the settings of the parent, kept for the parent', async () => {
    const { user } = openLesson();
    await user.click(
      within(await screen.findByRole('group', { name: 'Pismo teksta' })).getByRole('button', {
        name: 'Ćirilica',
      }),
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Фотосинтеза' })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(PARENT_KEY)!).script).toBe('cyrillic');
  });

  it('does not offer the student’s own things: the quiz, finishing the lesson', async () => {
    openLesson();
    await screen.findByRole('heading', { level: 1, name: 'Fotosinteza' });

    expect(screen.queryByRole('link', { name: 'Kreni na kviz' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Završi lekciju' })).not.toBeInTheDocument();
  });

  it('says whether the child finished the lesson, asking about this child', async () => {
    const { asked } = openLesson({ done: ['l1'] });

    expect(
      await screen.findByText('Dijete je završilo lekciju 4. novembar 2026.'),
    ).toBeInTheDocument();
    expect(asked.progress.every((id) => id === ANA.id)).toBe(true);
  });

  it('says when the child has not finished it yet', async () => {
    openLesson({ done: [] });

    expect(await screen.findByText('Dijete još nije završilo lekciju.')).toBeInTheDocument();
  });

  it('shows the questions of the quiz without saying which answer is right', async () => {
    const { user } = openLesson();
    const section = await screen.findByRole('region', { name: 'Pitanja kviza' });

    await user.click(within(section).getByText('Pogledaj pitanja'));

    expect(within(section).getByText(/Šta biljke prave\?/)).toBeInTheDocument();
    expect(
      within(section)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(expect.arrayContaining(['Hranu', 'Vodu', 'Kamen']));
    expect(section).not.toHaveTextContent(/tačan odgovor|isCorrect/i);
  });

  it('has no questions section when the lesson has no quiz', async () => {
    server.use(
      http.get('*/api/children', () => HttpResponse.json({ children: [ANA] })),
      http.get('*/api/lessons/:id', () =>
        HttpResponse.json({ lesson: { ...studentLessonOf({ quiz: null }), myProgress: null } }),
      ),
      http.get('*/api/subjects/:id/progress', () => HttpResponse.json(progressOf([], LESSONS))),
    );
    renderApp({ path: PATH });

    await screen.findByRole('heading', { level: 1, name: 'Fotosinteza' });
    expect(screen.queryByRole('region', { name: 'Pitanja kviza' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Pokušaji kviza' })).not.toBeInTheDocument();
  });
});

describe('The tries of a child', () => {
  const tries = [
    {
      id: 'b',
      status: 'completed',
      startedAt: '2026-11-05T10:00:00.000Z',
      completedAt: '2026-11-05T10:05:00.000Z',
      allCorrect: true,
      answers: [answerOf(true)],
    },
    {
      id: 'a',
      status: 'completed',
      startedAt: '2026-11-04T10:00:00.000Z',
      completedAt: '2026-11-04T10:05:00.000Z',
      allCorrect: false,
      answers: [answerOf(false)],
    },
  ];

  it('are asked for this child only when opened, with every question, answer and explanation', async () => {
    const { user, asked } = openLesson({ tries });
    await screen.findByRole('heading', { name: 'Pokušaji kviza' });
    expect(asked.tries).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Pogledaj pokušaje' }));

    const attempts = await screen.findAllByText(/^Pokušaj \d/, { exact: false });
    expect(attempts.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Pokušaj 2 · Svi odgovori tačni'),
      expect.stringContaining('Pokušaj 1 · Netačno: 1 od 1'),
    ]);
    expect(screen.getByText(/Odgovor djeteta: Vodu · Tačan odgovor: Hranu/)).toBeInTheDocument();
    // Each of the two tries shows the explanation of its question.
    expect(
      screen.getAllByText(/Objašnjenje: Biljke prave hranu uz pomoć svjetlosti\./),
    ).toHaveLength(2);
    expect(asked.tries).toEqual([ANA.id]);
  });

  it('say so when the child has not tried the quiz', async () => {
    const { user } = openLesson({ tries: [] });

    await user.click(await screen.findByRole('button', { name: 'Pogledaj pokušaje' }));

    expect(
      await screen.findByText('Dijete još nije pokušalo kviz ove lekcije.'),
    ).toBeInTheDocument();
  });
});

describe('Who may see the lesson', () => {
  it('is refused for a child who is not on the list of the parent', async () => {
    server.use(http.get('*/api/children', () => HttpResponse.json({ children: [ANA] })));
    renderApp({ path: '/parent/children/99999999-0000-4000-8000-000000000009/lessons/l1' });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Nemate pristup' }),
    ).toBeInTheDocument();
  });

  it('says it does not exist when the server says so', async () => {
    server.use(
      http.get('*/api/children', () => HttpResponse.json({ children: [ANA] })),
      http.get('*/api/lessons/:id', () =>
        HttpResponse.json(apiError('not_found'), { status: 404 }),
      ),
    );
    renderApp({ path: PATH });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Lekcija nije pronađena' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Nazad na dijete: Ana Marković/ })).toHaveAttribute(
      'href',
      `/parent/children/${ANA.id}`,
    );
  });

  it('offers a retry when the lesson cannot be loaded', async () => {
    let calls = 0;
    server.use(
      http.get('*/api/children', () => HttpResponse.json({ children: [ANA] })),
      http.get('*/api/lessons/:id', () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(apiError('internal_error'), { status: 500 })
          : HttpResponse.json({ lesson: { ...studentLessonOf(), myProgress: null } });
      }),
      http.get('*/api/subjects/:id/progress', () => HttpResponse.json(progressOf([], LESSONS))),
    );
    const { user } = renderApp({ path: PATH });

    await user.click(await screen.findByRole('button', { name: 'Pokušaj ponovo' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Fotosinteza' }),
    ).toBeInTheDocument();
  });
});

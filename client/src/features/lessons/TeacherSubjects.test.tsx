import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { apiError } from '@/test/authFixtures';
import { biology5b, listItem, math5a, math5b } from '@/test/lessonApiFixtures';
import { renderApp } from '@/test/renderApp';
import { server } from '@/test/server';

function answerSubjects(subjects = [biology5b, math5a, math5b]) {
  server.use(
    http.get('*/api/subjects/mine', () => HttpResponse.json({ subjects, schoolYear: 2026 })),
  );
}

beforeEach(() => {
  try {
    localStorage.clear();
  } catch {
    // Not available everywhere; the page works without it.
  }
});

describe('Moji predmeti', () => {
  it('shows the subjects of the teacher, and groups the same name into one card', async () => {
    answerSubjects();
    renderApp({ path: '/teacher' });

    expect(await screen.findByRole('heading', { level: 3, name: 'Biologija' })).toBeInTheDocument();
    const mathCard = screen
      .getByRole('heading', { level: 3, name: 'Matematika' })
      .closest('div')!.parentElement!;
    // One card, one row for each odeljenje.
    expect(within(mathCard).getByRole('link', { name: /Odjeljenje 5-1/ })).toBeInTheDocument();
    expect(within(mathCard).getByRole('link', { name: /Odjeljenje 5-2/ })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3, name: 'Matematika' })).toHaveLength(1);
  });

  it('shows counts and what waits for review, and links to the subject', async () => {
    answerSubjects();
    renderApp({ path: '/teacher' });

    const link = await screen.findByRole('link', { name: /Odjeljenje 5-2.*3 lekcije.*3 učenika/ });
    expect(link).toHaveTextContent('čeka tvoj pregled: 1');
    expect(link).toHaveAttribute('href', `/teacher/subjects/${biology5b.id}`);
  });

  it('switches to the view by odeljenje and remembers the choice', async () => {
    answerSubjects();
    const { user, unmount } = renderApp({ path: '/teacher' });
    await screen.findByRole('heading', { level: 3, name: 'Biologija' });

    await user.click(screen.getByRole('button', { name: 'Po odjeljenjima' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Odjeljenje 5-1' })).toBeInTheDocument();
    const section = screen
      .getByRole('heading', { level: 2, name: 'Odjeljenje 5-2' })
      .closest('section')!;
    expect(
      within(section)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['Biologija', 'Matematika']);
    expect(screen.getByRole('button', { name: 'Po odjeljenjima' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    unmount();
    renderApp({ path: '/teacher' });
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Odjeljenje 5-1' }),
    ).toBeInTheDocument();
  });

  it('says so when the teacher has no subjects', async () => {
    answerSubjects([]);
    renderApp({ path: '/teacher' });
    expect(await screen.findByText(/nijedan predmet/)).toBeInTheDocument();
  });

  it('shows a loading state and then an error with a retry', async () => {
    let calls = 0;
    server.use(
      http.get('*/api/subjects/mine', () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(apiError('internal_error'), { status: 500 })
          : HttpResponse.json({ subjects: [biology5b], schoolYear: 2026 });
      }),
    );
    const { user } = renderApp({ path: '/teacher' });

    expect(screen.getByRole('status')).toHaveTextContent('Učitavanje');
    expect(await screen.findByRole('alert')).toHaveTextContent('Nije moguće učitati podatke');

    await user.click(screen.getByRole('button', { name: 'Pokušaj ponovo' }));
    expect(await screen.findByRole('heading', { level: 3, name: 'Biologija' })).toBeInTheDocument();
  });
});

describe('Lessons of a subject', () => {
  function answerLessons() {
    const requests: string[] = [];
    server.use(
      http.get('*/api/lessons', ({ request }) => {
        const url = new URL(request.url);
        requests.push(url.search);
        const status = url.searchParams.get('status');
        const all = [
          listItem({ id: 'l1', title: 'Fotosinteza', status: 'draft' }),
          listItem({ id: 'l2', title: 'Disanje biljaka', status: 'in_review' }),
          listItem({
            id: 'l3',
            title: 'Ćelija',
            status: 'published',
            publishedAt: '2026-11-03T10:00:00.000Z',
          }),
        ];
        const lessons = status ? all.filter((lesson) => lesson.status === status) : all;
        return HttpResponse.json({ lessons, total: lessons.length });
      }),
    );
    return requests;
  }

  it('lists the lessons with their state and asks the server for each filter', async () => {
    answerSubjects();
    const requests = answerLessons();
    const { user } = renderApp({ path: `/teacher/subjects/${biology5b.id}` });

    expect(await screen.findByRole('heading', { level: 1, name: 'Biologija' })).toBeInTheDocument();
    expect(screen.getByText(/Odjeljenje 5-2 · 3 učenika/)).toBeInTheDocument();
    await screen.findByText('Fotosinteza');
    const lessonLinks = within(screen.getByRole('main'))
      .getAllByRole('link')
      .filter((link) => /^\/teacher\/lessons\/(?!new)/.test(link.getAttribute('href') ?? ''));
    expect(lessonLinks.map((link) => link.textContent)).toEqual([
      expect.stringContaining('Fotosinteza'),
      expect.stringContaining('Disanje biljaka'),
      expect.stringContaining('Ćelija'),
    ]);
    expect(within(lessonLinks[1]!).getByText('Čeka pregled')).toBeInTheDocument();
    expect(requests[0]).toContain(`subjectId=${biology5b.id}`);

    await user.click(screen.getByRole('button', { name: /Objavljena/ }));

    await waitFor(() => expect(screen.queryByText('Fotosinteza')).not.toBeInTheDocument());
    expect(screen.getByText('Ćelija')).toBeInTheDocument();
    expect(requests.some((query) => query.includes('status=published'))).toBe(true);
  });

  it('shows the counts of every state on the filter buttons', async () => {
    answerSubjects();
    answerLessons();
    renderApp({ path: `/teacher/subjects/${biology5b.id}` });

    const filters = await screen.findByRole('group', { name: 'Prikaz lekcija' });
    expect(within(filters).getByRole('button', { name: /Sve/ })).toHaveTextContent('3');
    expect(within(filters).getByRole('button', { name: /AI radi/ })).toHaveTextContent('0');
  });

  it('offers to add the first lesson when a subject has none', async () => {
    answerSubjects();
    server.use(http.get('*/api/lessons', () => HttpResponse.json({ lessons: [], total: 0 })));
    renderApp({ path: `/teacher/subjects/${math5a.id}` });

    expect(await screen.findByText(/još nema lekcija\. Dodaj prvu/)).toBeInTheDocument();
    const add = screen.getAllByRole('link', { name: 'Dodaj lekciju' });
    expect(add.some((link) => link.getAttribute('href')?.includes(`subject=${math5a.id}`))).toBe(
      true,
    );
  });

  it('says when the subject is not one of the teacher’s', async () => {
    answerSubjects();
    server.use(http.get('*/api/lessons', () => HttpResponse.json({ lessons: [], total: 0 })));
    renderApp({ path: '/teacher/subjects/00000000-0000-4000-8000-00000000dead' });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Predmet nije pronađen' }),
    ).toBeInTheDocument();
  });

  it('asks for more lessons when the server has more than it showed', async () => {
    answerSubjects();
    const requests: string[] = [];
    server.use(
      http.get('*/api/lessons', ({ request }) => {
        const limit = Number(new URL(request.url).searchParams.get('limit'));
        requests.push(String(limit));
        const lessons = Array.from({ length: Math.min(limit, 60) }, (_, index) =>
          listItem({ id: `l${index}`, title: `Lekcija ${index + 1}` }),
        );
        return HttpResponse.json({ lessons, total: 60 });
      }),
    );
    const { user } = renderApp({ path: `/teacher/subjects/${biology5b.id}` });

    expect(await screen.findByText('Prikazano 50 od 60')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Prikaži još' }));

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Prikaži još' })).toBeNull());
    expect(requests).toEqual(['50', '100']);
  });
});

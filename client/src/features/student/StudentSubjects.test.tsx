import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { apiError } from '@/test/authFixtures';
import { biology5b } from '@/test/lessonApiFixtures';
import { renderApp } from '@/test/renderApp';
import { server } from '@/test/server';
import {
  automaticStar,
  catalogSubject,
  enrollmentOf,
  progressOf,
  teacherStar,
} from '@/test/studentApiFixtures';
import type { Enrollment } from '@/features/subject-requests/api/enrollmentsApi';
import type { CatalogSubject } from '@/features/student/api/studentApi';

const LESSONS = [
  { id: 'l1', title: 'Fotosinteza' },
  { id: 'l2', title: 'Disanje biljaka' },
  { id: 'l3', title: 'Ćelija' },
];

function answerRequests(enrollments: Enrollment[]) {
  server.use(
    http.get('*/api/enrollments', () =>
      HttpResponse.json({ enrollments, total: enrollments.length }),
    ),
  );
}

function answerStars(stars = [automaticStar, teacherStar]) {
  server.use(
    http.get('*/api/stars', () =>
      HttpResponse.json({
        stars,
        counts: {
          automatic: stars.filter((star) => star.source === 'automatic').length,
          teacher: stars.filter((star) => star.source === 'teacher').length,
        },
      }),
    ),
  );
}

function answerProgress(done: string[] = ['l1']) {
  server.use(
    http.get('*/api/subjects/:id/progress', () => HttpResponse.json(progressOf(done, LESSONS))),
  );
}

describe('Moji predmeti', () => {
  it('shows the subjects the student joined, how far they got, and the stars', async () => {
    answerRequests([
      enrollmentOf(),
      enrollmentOf({ id: 'e2', status: 'awaiting_teacher' }),
      enrollmentOf({ id: 'e3', status: 'rejected' }),
    ]);
    answerProgress(['l1']);
    answerStars();
    renderApp({ path: '/student' });

    expect(await screen.findByText('Zdravo, Ana!')).toBeInTheDocument();
    // Only the approved request is a subject; the others are only counted as waiting.
    const subjects = await screen.findAllByRole('link', { name: /Biologija, Odjeljenje 5-2/ });
    expect(subjects).toHaveLength(1);
    expect(subjects[0]).toHaveAttribute('href', `/student/subjects/${biology5b.id}`);
    expect(await within(subjects[0]!).findByText('pređeno 1 od 3')).toBeInTheDocument();
    expect(subjects[0]).toHaveTextContent('Milica Petrović');
    expect(screen.getByRole('link', { name: '1 zahtjev čeka odgovor' })).toHaveAttribute(
      'href',
      '/student/join',
    );
    expect(await screen.findByRole('link', { name: /Zvjezdice za trud\s*2/ })).toBeInTheDocument();
  });

  it('shows the menu with the number of stars, and the name of the person', async () => {
    answerRequests([]);
    answerStars();
    renderApp({ path: '/student' });

    const menu = await screen.findByRole('navigation', { name: 'Učenička navigacija' });
    expect(
      within(menu)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Moji predmeti', 'Prijava na predmet', expect.stringContaining('Moje zvjezdice')]);
    await waitFor(() =>
      expect(within(menu).getByRole('link', { name: /Moje zvjezdice/ })).toHaveTextContent('2'),
    );
    expect(screen.getByText('Ana Marković')).toBeInTheDocument();
    expect(screen.getByText(/ana_markovic/)).toBeInTheDocument();
  });

  it('invites to join a subject when there is none', async () => {
    answerRequests([]);
    answerStars([]);
    renderApp({ path: '/student' });

    expect(await screen.findByText('Još nisi upisan/a ni na jedan predmet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Prijavi se na predmet/ })).toHaveAttribute(
      'href',
      '/student/join',
    );
  });

  it('offers a retry when the subjects cannot be loaded', async () => {
    let calls = 0;
    server.use(
      http.get('*/api/enrollments', () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(apiError('internal_error'), { status: 500 })
          : HttpResponse.json({ enrollments: [enrollmentOf()], total: 1 });
      }),
    );
    answerProgress();
    answerStars();
    const { user } = renderApp({ path: '/student' });

    await user.click(await screen.findByRole('button', { name: 'Pokušaj ponovo' }));

    expect(await screen.findAllByRole('link', { name: /Biologija/ })).not.toHaveLength(0);
  });
});

describe('Prijava na predmet', () => {
  function answerCatalog(subjects: CatalogSubject[], total = subjects.length) {
    const asked: URLSearchParams[] = [];
    server.use(
      http.get('*/api/catalog/classes', () =>
        HttpResponse.json({
          classes: [
            { id: 'c1', name: '5-1', schoolYear: 2026, subjectCount: 2 },
            { id: 'c2', name: '5-2', schoolYear: 2026, subjectCount: 3 },
          ],
          schoolYear: 2026,
        }),
      ),
      http.get('*/api/catalog/subjects', ({ request }) => {
        asked.push(new URL(request.url).searchParams);
        return HttpResponse.json({ subjects, total, schoolYear: 2026 });
      }),
    );
    return asked;
  }

  it('lists the subjects with their odeljenje and teacher, and nothing is preselected', async () => {
    answerRequests([]);
    const asked = answerCatalog([catalogSubject()]);
    renderApp({ path: '/student/join' });

    const row = (await screen.findByText('Geografija')).closest('div.flex')!;
    expect(row).toHaveTextContent('Odjeljenje 5-2 · Nastavnik: Nenad Ilić');
    expect(screen.getByLabelText('Odjeljenje')).toHaveValue('');
    expect(asked[0]!.get('classId')).toBeNull();
    expect(asked[0]!.get('search')).toBeNull();
  });

  it('shows the state of each request, and offers the button only when a request can be sent', async () => {
    answerRequests([]);
    answerCatalog([
      catalogSubject({ id: 's1', name: 'Matematika' }),
      catalogSubject({
        id: 's2',
        name: 'Fizika',
        request: { id: 'r2', status: 'awaiting_parent' },
      }),
      catalogSubject({
        id: 's3',
        name: 'Hemija',
        request: { id: 'r3', status: 'awaiting_teacher' },
      }),
      catalogSubject({ id: 's4', name: 'Biologija', request: { id: 'r4', status: 'approved' } }),
      catalogSubject({ id: 's5', name: 'Muzika', request: { id: 'r5', status: 'rejected' } }),
    ]);
    renderApp({ path: '/student/join' });

    const results = await screen.findByRole('region', { name: 'Predmeti' });
    const rows = await within(results).findAllByRole('listitem');
    const byName = (name: string) => rows.find((row) => row.textContent?.includes(name))!;

    expect(
      within(byName('Matematika')).getByRole('button', { name: /Prijavi se/ }),
    ).toBeInTheDocument();
    expect(byName('Fizika')).toHaveTextContent('Čeka roditelja');
    expect(within(byName('Fizika')).queryByRole('button')).not.toBeInTheDocument();
    expect(byName('Hemija')).toHaveTextContent('Čeka nastavnika');
    expect(byName('Biologija')).toHaveTextContent('Upisan/a');
    expect(within(byName('Biologija')).queryByRole('button')).not.toBeInTheDocument();
    expect(byName('Muzika')).toHaveTextContent('Odbijeno');
    expect(byName('Muzika')).toHaveTextContent('Možeš ponovo poslati zahtjev.');
    expect(
      within(byName('Muzika')).getByRole('button', { name: /Pošalji ponovo/ }),
    ).toBeInTheDocument();
  });

  it('asks the server for one odeljenje, and for a search after the typing stops', async () => {
    answerRequests([]);
    const asked = answerCatalog([catalogSubject()]);
    const { user } = renderApp({ path: '/student/join' });
    await screen.findByText('Geografija');

    await user.selectOptions(screen.getByLabelText('Odjeljenje'), '5-1');
    await waitFor(() => expect(asked.at(-1)!.get('classId')).toBe('c1'));

    await user.type(screen.getByLabelText(/Traži predmet/), 'geo');
    await waitFor(() => expect(asked.at(-1)!.get('search')).toBe('geo'));
    // One request after the pause, not one for each letter.
    expect(
      asked.filter((query) => query.get('search') !== null).map((q) => q.get('search')),
    ).toEqual(['geo']);
  });

  it('says when nothing matches, and when the school has no subjects at all', async () => {
    answerRequests([]);
    answerCatalog([]);
    const { user } = renderApp({ path: '/student/join' });

    expect(await screen.findByText(/Škola još nije napravila predmete/)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Odjeljenje'), '5-2');
    expect(await screen.findByText(/Nijedan predmet ne odgovara/)).toBeInTheDocument();
  });

  it('asks for more subjects when there are more than were shown', async () => {
    answerRequests([]);
    const asked = answerCatalog([catalogSubject()], 70);
    const { user } = renderApp({ path: '/student/join' });

    expect(await screen.findByText('Prikazano 1 od 70')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Prikaži još' }));

    await waitFor(() => expect(asked.at(-1)!.get('limit')).toBe('100'));
  });

  describe('sending a request', () => {
    function keepCatalog() {
      const state = {
        subject: catalogSubject({ id: 's1', name: 'Matematika' }),
        sent: [] as unknown[],
      };
      server.use(
        http.get('*/api/catalog/classes', () =>
          HttpResponse.json({ classes: [], schoolYear: 2026 }),
        ),
        http.get('*/api/catalog/subjects', () =>
          HttpResponse.json({ subjects: [state.subject], total: 1, schoolYear: 2026 }),
        ),
        http.post('*/api/enrollments', async ({ request }) => {
          state.sent.push(await request.json());
          state.subject = { ...state.subject, request: { id: 'new', status: 'awaiting_parent' } };
          return HttpResponse.json(
            { enrollment: enrollmentOf({ id: 'new', status: 'awaiting_parent' }) },
            { status: 201 },
          );
        }),
      );
      return state;
    }

    it('sends only the subject, says so, and shows the request as waiting for a parent', async () => {
      answerRequests([]);
      const state = keepCatalog();
      const { user } = renderApp({ path: '/student/join' });

      await user.click(
        await screen.findByRole('button', { name: 'Prijavi se: Matematika, odjeljenje 5-2' }),
      );

      expect(
        await screen.findByText('Zahtjev je poslat. Čeka potvrdu roditelja.'),
      ).toBeInTheDocument();
      expect(state.sent).toEqual([{ subjectId: 's1' }]);
      const row = (await screen.findByText('Matematika', { selector: 'p' })).closest('div.flex')!;
      await waitFor(() => expect(row).toHaveTextContent('Čeka roditelja'));
      expect(within(row as HTMLElement).queryByRole('button')).not.toBeInTheDocument();
    });

    it.each([
      ['no_parent', 409, /nije povezan nijedan roditelj/],
      ['request_exists', 409, /već postoji zahtjev/],
      ['invalid_subject', 400, /ne može izabrati/],
    ])('explains %s', async (code, status, message) => {
      answerRequests([]);
      keepCatalog();
      server.use(
        http.post('*/api/enrollments', () => HttpResponse.json(apiError(code), { status })),
      );
      const { user } = renderApp({ path: '/student/join' });

      await user.click(await screen.findByRole('button', { name: /Prijavi se: Matematika/ }));

      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(screen.getByRole('button', { name: /Prijavi se: Matematika/ })).toBeEnabled();
    });

    it('explains when the server cannot be reached', async () => {
      answerRequests([]);
      keepCatalog();
      server.use(http.post('*/api/enrollments', () => HttpResponse.error()));
      const { user } = renderApp({ path: '/student/join' });

      await user.click(await screen.findByRole('button', { name: /Prijavi se: Matematika/ }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Server trenutno nije dostupan');
    });
  });

  it('lists the requests that are not approved yet, with their state', async () => {
    answerRequests([
      enrollmentOf({ id: 'a', status: 'approved' }),
      enrollmentOf({
        id: 'b',
        status: 'awaiting_parent',
        subject: { id: 's9', name: 'Hemija', className: '5-2', schoolYear: 2026 },
      }),
      enrollmentOf({
        id: 'c',
        status: 'rejected',
        subject: { id: 's8', name: 'Muzika', className: '5-1', schoolYear: 2026 },
      }),
    ]);
    answerCatalog([]);
    renderApp({ path: '/student/join' });

    const section = await screen.findByRole('region', { name: 'Moji zahtjevi' });
    const rows = await within(section).findAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Hemija');
    expect(rows[0]).toHaveTextContent('Čeka roditelja');
    expect(rows[1]).toHaveTextContent('Muzika');
    expect(rows[1]).toHaveTextContent('Odbijeno');
    expect(section).not.toHaveTextContent('Upisan/a');
  });

  it('says there are no waiting requests', async () => {
    answerRequests([enrollmentOf()]);
    answerCatalog([]);
    renderApp({ path: '/student/join' });

    expect(await screen.findByText('Nemaš zahtjeva koji čekaju.')).toBeInTheDocument();
  });

  // The page that is shown to someone who is not a student is covered with the role guard tests.
});

describe('Lekcije predmeta', () => {
  function answerLessons(lessons = LESSONS) {
    server.use(
      http.get('*/api/lessons', ({ request }) => {
        expect(new URL(request.url).searchParams.get('subjectId')).toBe(biology5b.id);
        return HttpResponse.json({
          lessons: lessons.map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            status: 'published',
            subject: { id: biology5b.id, name: 'Biologija', className: '5-2', schoolYear: 2026 },
            publishedAt: '2026-11-03T10:00:00.000Z',
            createdAt: '2026-11-01T10:00:00.000Z',
            updatedAt: '2026-11-03T10:00:00.000Z',
          })),
          total: lessons.length,
        });
      }),
    );
  }

  it('lists the published lessons with the finished ones marked, and the progress', async () => {
    answerRequests([enrollmentOf()]);
    answerLessons();
    answerProgress(['l1']);
    renderApp({ path: `/student/subjects/${biology5b.id}` });

    expect(await screen.findByRole('heading', { level: 1, name: 'Biologija' })).toBeInTheDocument();
    expect(screen.getByText(/Odjeljenje 5-2 · Milica Petrović/)).toBeInTheDocument();
    const lessons = await screen.findAllByRole('link', {
      name: /Fotosinteza|Disanje biljaka|Ćelija/,
    });
    expect(lessons.map((link) => link.getAttribute('href'))).toEqual([
      '/student/lessons/l1',
      '/student/lessons/l2',
      '/student/lessons/l3',
    ]);
    expect(lessons[0]).toHaveTextContent('Pređena');
    expect(lessons[1]).toHaveTextContent('Nije pređena');
    const bar = await screen.findByRole('progressbar', { name: 'Napredak u predmetu' });
    expect(bar).toHaveAttribute('aria-valuenow', '1');
    expect(bar).toHaveAttribute('aria-valuemax', '3');
    expect(screen.getByText('1 od 3 lekcija')).toBeInTheDocument();
  });

  it('says when the subject has no lessons yet', async () => {
    answerRequests([enrollmentOf()]);
    answerLessons([]);
    server.use(
      http.get('*/api/subjects/:id/progress', () => HttpResponse.json(progressOf([], []))),
    );
    renderApp({ path: `/student/subjects/${biology5b.id}` });

    expect(await screen.findByText(/još nema lekcija/)).toBeInTheDocument();
  });

  it('does not show a subject the student has not joined', async () => {
    answerRequests([enrollmentOf({ status: 'awaiting_teacher' })]);
    answerLessons();
    answerProgress();
    renderApp({ path: `/student/subjects/${biology5b.id}` });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Predmet nije pronađen' }),
    ).toBeInTheDocument();
  });
});

describe('Moje zvjezdice', () => {
  it('shows the two kinds of stars, named differently, with the message of the teacher', async () => {
    answerRequests([]);
    answerStars();
    renderApp({ path: '/student/stars' });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Moje zvjezdice' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Za završene lekcije: 1')).toBeInTheDocument();
    expect(screen.getByText('Od nastavnika: 1')).toBeInTheDocument();
    const rows = screen
      .getAllByRole('listitem')
      .filter((item) => item.textContent?.includes('Predmet:'));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Završena lekcija');
    expect(rows[0]).toHaveTextContent('Fotosinteza');
    expect(rows[1]).toHaveTextContent('Od nastavnika');
    expect(rows[1]).toHaveTextContent('Lijepo si radila na času');
    expect(rows[1]).toHaveTextContent('Dao/la Milica Petrović');
  });

  it('encourages the first star when there is none', async () => {
    answerRequests([]);
    answerStars([]);
    renderApp({ path: '/student/stars' });

    expect(await screen.findByText(/Još nemaš zvjezdica/)).toBeInTheDocument();
  });

  it('offers a retry when the stars cannot be loaded', async () => {
    answerRequests([]);
    let calls = 0;
    server.use(
      http.get('*/api/stars', () => {
        calls += 1;
        return calls <= 1
          ? HttpResponse.json(apiError('internal_error'), { status: 500 })
          : HttpResponse.json({ stars: [], counts: { automatic: 0, teacher: 0 } });
      }),
    );
    const { user } = renderApp({ path: '/student/stars' });

    await user.click(await screen.findByRole('button', { name: 'Pokušaj ponovo' }));

    expect(await screen.findByText(/Još nemaš zvjezdica/)).toBeInTheDocument();
  });
});

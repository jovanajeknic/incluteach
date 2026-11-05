import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { Enrollment } from '@/features/subject-requests/api/enrollmentsApi';
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

const ANA = { id: '40000000-0000-4000-8000-000000000001', fullName: 'Ana Marković' };
const LUKA = { id: '40000000-0000-4000-8000-000000000002', fullName: 'Luka Marković' };
const LESSONS = [
  { id: 'l1', title: 'Fotosinteza' },
  { id: 'l2', title: 'Disanje biljaka' },
];

function answerChildren(children = [ANA, LUKA]) {
  server.use(http.get('*/api/children', () => HttpResponse.json({ children })));
}

/** Answers the requests of each child separately, and records which child was asked about. */
function answerRequests(byChild: Record<string, Enrollment[]>) {
  const asked: (string | null)[] = [];
  server.use(
    http.get('*/api/enrollments', ({ request }) => {
      const studentId = new URL(request.url).searchParams.get('studentId');
      asked.push(studentId);
      const list = (studentId && byChild[studentId]) || [];
      return HttpResponse.json({ enrollments: list, total: list.length });
    }),
  );
  return asked;
}

function answerStars(
  byChild: Record<string, { stars: unknown[]; automatic: number; teacher: number }> = {},
) {
  server.use(
    http.get('*/api/stars', ({ request }) => {
      const studentId = new URL(request.url).searchParams.get('studentId') ?? '';
      const own = byChild[studentId] ?? { stars: [], automatic: 0, teacher: 0 };
      return HttpResponse.json({
        stars: own.stars,
        counts: { automatic: own.automatic, teacher: own.teacher },
      });
    }),
  );
}

function answerProgress(done: Record<string, string[]> = {}) {
  const asked: string[] = [];
  server.use(
    http.get('*/api/subjects/:id/progress', ({ request }) => {
      const studentId = new URL(request.url).searchParams.get('studentId') ?? '';
      asked.push(studentId);
      return HttpResponse.json(progressOf(done[studentId] ?? [], LESSONS));
    }),
  );
  return asked;
}

const forChild = (child: typeof ANA, overrides: Partial<Enrollment> = {}) =>
  enrollmentOf({ student: child, ...overrides });

describe('Moja djeca', () => {
  it('shows each child with the subjects, the progress and the stars, and asks about each child', async () => {
    answerChildren();
    const asked = answerRequests({
      [ANA.id]: [forChild(ANA)],
      [LUKA.id]: [
        forChild(LUKA, {
          id: 'e9',
          subject: { id: 'math', name: 'Matematika', className: '5-1', schoolYear: 2026 },
        }),
      ],
    });
    const progressAsked = answerProgress({ [ANA.id]: ['l1'] });
    answerStars({ [ANA.id]: { stars: [automaticStar], automatic: 1, teacher: 0 } });
    renderApp({ path: '/parent' });

    const ana = (await screen.findByRole('heading', { level: 2, name: 'Ana Marković' })).closest(
      'article',
    )!;
    const luka = screen
      .getByRole('heading', { level: 2, name: 'Luka Marković' })
      .closest('article')!;
    expect(await within(ana).findByText('Biologija')).toBeInTheDocument();
    expect(await within(ana).findByText('pređeno 1 od 2')).toBeInTheDocument();
    expect(await within(ana).findByText('Zvjezdice: 1')).toBeInTheDocument();
    expect(within(luka).getByText('Matematika')).toBeInTheDocument();
    expect(within(luka).queryByText('Biologija')).not.toBeInTheDocument();
    expect(within(ana).getByRole('link', { name: 'Otvori: Ana Marković' })).toHaveAttribute(
      'href',
      `/parent/children/${ANA.id}`,
    );
    // Every call is about one child, named in the request.
    // (The menu also asks, without a child, for the requests that wait for the parent.)
    expect(new Set(asked.filter(Boolean))).toEqual(new Set([ANA.id, LUKA.id]));
    expect(new Set(progressAsked)).toEqual(new Set([ANA.id, LUKA.id]));
  });

  it('shows the name of the parent in the menu, and the one place to go', async () => {
    answerChildren([]);
    renderApp({ path: '/parent' });

    const menu = await screen.findByRole('navigation', { name: 'Roditeljska navigacija' });
    expect(
      within(menu)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Moja djeca', 'Zahtjevi']);
    expect(screen.getByText('Petar Marković')).toBeInTheDocument();
    expect(screen.getByText(/petar_markovic/)).toBeInTheDocument();
  });

  it('tells the parent to ask the school when no child is linked', async () => {
    answerChildren([]);
    renderApp({ path: '/parent' });

    expect(await screen.findByText(/nije povezano nijedno dijete/)).toBeInTheDocument();
  });

  it('says how many requests of the children wait for the parent', async () => {
    answerChildren([ANA]);
    answerRequests({ [ANA.id]: [forChild(ANA, { status: 'awaiting_parent' })] });
    answerProgress();
    answerStars();
    renderApp({ path: '/parent' });

    expect(await screen.findByText('1 zahtjev čeka tvoj odgovor')).toBeInTheDocument();
  });

  it('offers a retry when the children cannot be loaded', async () => {
    let calls = 0;
    server.use(
      http.get('*/api/children', () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(apiError('internal_error'), { status: 500 })
          : HttpResponse.json({ children: [] });
      }),
    );
    const { user } = renderApp({ path: '/parent' });

    await user.click(await screen.findByRole('button', { name: 'Pokušaj ponovo' }));

    expect(await screen.findByText(/nije povezano nijedno dijete/)).toBeInTheDocument();
  });
});

describe('One child', () => {
  const PATH = `/parent/children/${ANA.id}`;

  function openAna(requests: Enrollment[] = [forChild(ANA)]) {
    answerChildren();
    answerRequests({ [ANA.id]: requests });
    answerProgress({ [ANA.id]: ['l1'] });
    answerStars({
      [ANA.id]: { stars: [automaticStar, teacherStar], automatic: 1, teacher: 1 },
    });
    return renderApp({ path: PATH });
  }

  it('shows the subjects, which lead to the lessons of this child', async () => {
    openAna();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ana Marković' }),
    ).toBeInTheDocument();
    const subject = await screen.findByRole('link', { name: /Biologija, Odjeljenje 5-2/ });
    expect(subject).toHaveAttribute('href', `${PATH}/subjects/${biology5b.id}`);
    expect(await within(subject).findByText('pređeno 1 od 2')).toBeInTheDocument();
  });

  it('shows the requests that are not approved yet, with their state', async () => {
    openAna([
      forChild(ANA),
      forChild(ANA, {
        id: 'e2',
        status: 'awaiting_parent',
        subject: { id: 's2', name: 'Hemija', className: '5-2', schoolYear: 2026 },
      }),
      forChild(ANA, {
        id: 'e3',
        status: 'rejected',
        subject: { id: 's3', name: 'Muzika', className: '5-1', schoolYear: 2026 },
      }),
    ]);

    const section = await screen.findByRole('region', { name: 'Zahtjevi za predmete' });
    const rows = await within(section).findAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Hemija');
    expect(rows[0]).toHaveTextContent('Čeka roditelja');
    expect(rows[1]).toHaveTextContent('Odbijeno');
  });

  it('shows the two kinds of stars of this child', async () => {
    openAna();

    const section = await screen.findByRole('region', { name: 'Zvjezdice za trud' });
    expect(await within(section).findByText('Za završene lekcije: 1')).toBeInTheDocument();
    expect(within(section).getByText('Od nastavnika: 1')).toBeInTheDocument();
    expect(within(section).getByText('Lijepo si radila na času')).toBeInTheDocument();
  });

  it('leads to asking for a subject for this child', async () => {
    openAna();

    expect(await screen.findByRole('link', { name: 'Prijavi dijete na predmet' })).toHaveAttribute(
      'href',
      `${PATH}/join`,
    );
  });

  it('refuses a child who is not on the list of this parent, without asking about the child', async () => {
    answerChildren();
    const asked = answerRequests({});
    answerStars();
    const stranger = '99999999-0000-4000-8000-000000000009';
    renderApp({ path: `/parent/children/${stranger}` });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Nemate pristup' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Moja djeca' })).toHaveLength(2);
    expect(asked).not.toContain(stranger);
  });
});

describe('Asking for a subject for a child', () => {
  const PATH = `/parent/children/${ANA.id}/join`;

  function openJoin() {
    answerChildren();
    answerRequests({ [ANA.id]: [] });
    const state = {
      subject: catalogSubject({ id: 's1', name: 'Matematika' }),
      sent: [] as unknown[],
      asked: [] as URLSearchParams[],
    };
    server.use(
      http.get('*/api/catalog/classes', () =>
        HttpResponse.json({
          classes: [{ id: 'c1', name: '5-1', schoolYear: 2026, subjectCount: 1 }],
          schoolYear: 2026,
        }),
      ),
      http.get('*/api/catalog/subjects', ({ request }) => {
        state.asked.push(new URL(request.url).searchParams);
        return HttpResponse.json({ subjects: [state.subject], total: 1, schoolYear: 2026 });
      }),
      http.post('*/api/enrollments', async ({ request }) => {
        state.sent.push(await request.json());
        state.subject = { ...state.subject, request: { id: 'new', status: 'awaiting_teacher' } };
        return HttpResponse.json(
          { enrollment: forChild(ANA, { id: 'new', status: 'awaiting_teacher' }) },
          { status: 201 },
        );
      }),
    );
    return { state, ...renderApp({ path: PATH }) };
  }

  it('names the child in the catalog and in the request, which goes straight to the teacher', async () => {
    const { state, user } = openJoin();

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Prijava na predmet za dijete: Ana Marković',
      }),
    ).toBeInTheDocument();
    await user.click(
      await screen.findByRole('button', { name: 'Prijavi dijete: Matematika, odjeljenje 5-2' }),
    );

    expect(await screen.findByText('Zahtjev je poslat nastavniku predmeta.')).toBeInTheDocument();
    expect(state.sent).toEqual([{ subjectId: 's1', studentId: ANA.id }]);
    expect(state.asked[0]!.get('studentId')).toBe(ANA.id);
    // A parent's request waits for the teacher, not for a parent.
    const row = (await screen.findByText('Matematika', { selector: 'p' })).closest('div.flex')!;
    await waitFor(() => expect(row).toHaveTextContent('Čeka nastavnika'));
  });

  it('shows the requests of this child', async () => {
    answerChildren();
    answerRequests({
      [ANA.id]: [
        forChild(ANA, {
          id: 'w',
          status: 'awaiting_teacher',
          subject: { id: 's9', name: 'Hemija', className: '5-2', schoolYear: 2026 },
        }),
      ],
    });
    server.use(
      http.get('*/api/catalog/classes', () => HttpResponse.json({ classes: [], schoolYear: 2026 })),
      http.get('*/api/catalog/subjects', () =>
        HttpResponse.json({ subjects: [], total: 0, schoolYear: 2026 }),
      ),
    );
    renderApp({ path: PATH });

    const section = await screen.findByRole('region', { name: 'Zahtjevi djeteta' });
    expect(await within(section).findByText('Hemija')).toBeInTheDocument();
    expect(section).toHaveTextContent('Čeka nastavnika');
  });

  it('explains a refusal in Serbian', async () => {
    const { user } = openJoin();
    server.use(
      http.post('*/api/enrollments', () =>
        HttpResponse.json(apiError('request_exists'), { status: 409 }),
      ),
    );

    await user.click(await screen.findByRole('button', { name: /Prijavi dijete: Matematika/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/već postoji zahtjev/);
  });

  it('is refused for a child who is not on the list', async () => {
    answerChildren();
    renderApp({ path: '/parent/children/99999999-0000-4000-8000-000000000009/join' });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Nemate pristup' }),
    ).toBeInTheDocument();
  });
});

describe('The subject of a child', () => {
  const PATH = `/parent/children/${ANA.id}/subjects/${biology5b.id}`;

  function openSubject(requests: Enrollment[] = [forChild(ANA)]) {
    answerChildren();
    answerRequests({ [ANA.id]: requests });
    const progressAsked = answerProgress({ [ANA.id]: ['l1'] });
    const lessonsAsked: URLSearchParams[] = [];
    server.use(
      http.get('*/api/lessons', ({ request }) => {
        lessonsAsked.push(new URL(request.url).searchParams);
        return HttpResponse.json({
          lessons: LESSONS.map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            status: 'published',
            subject: { id: biology5b.id, name: 'Biologija', className: '5-2', schoolYear: 2026 },
            publishedAt: '2026-11-03T10:00:00.000Z',
            createdAt: '2026-11-01T10:00:00.000Z',
            updatedAt: '2026-11-03T10:00:00.000Z',
          })),
          total: LESSONS.length,
        });
      }),
    );
    return { progressAsked, lessonsAsked, ...renderApp({ path: PATH }) };
  }

  it('lists the lessons with the ones the child finished marked, asking about this child', async () => {
    const { progressAsked, lessonsAsked } = openSubject();

    expect(await screen.findByRole('heading', { level: 1, name: 'Biologija' })).toBeInTheDocument();
    const lessons = await screen.findAllByRole('link', { name: /Fotosinteza|Disanje biljaka/ });
    expect(lessons[0]).toHaveTextContent('Pređena');
    expect(lessons[1]).toHaveTextContent('Nije pređena');
    expect(lessons[0]).toHaveAttribute('href', `/parent/children/${ANA.id}/lessons/l1`);
    expect(screen.getByRole('link', { name: 'Nazad na dijete: Ana Marković' })).toHaveAttribute(
      'href',
      `/parent/children/${ANA.id}`,
    );
    expect(lessonsAsked[0]!.get('studentId')).toBe(ANA.id);
    expect(lessonsAsked[0]!.get('subjectId')).toBe(biology5b.id);
    expect(progressAsked.every((id) => id === ANA.id)).toBe(true);
  });

  it('says so when the child has not joined the subject', async () => {
    openSubject([forChild(ANA, { status: 'awaiting_teacher' })]);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Predmet nije pronađen' }),
    ).toBeInTheDocument();
  });
});

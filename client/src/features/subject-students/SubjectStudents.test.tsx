import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { Star, SubjectStudents } from '@/features/subject-students/api/studentsApi';
import { apiError, testUsers } from '@/test/authFixtures';
import { biology5b, math5a, math5b } from '@/test/lessonApiFixtures';
import { renderApp } from '@/test/renderApp';
import { server } from '@/test/server';

const ANA = { id: '40000000-0000-4000-8000-000000000001', fullName: 'Ana Marković' };
const LUKA = { id: '40000000-0000-4000-8000-000000000002', fullName: 'Luka Stanić' };
const MARKO = { id: '40000000-0000-4000-8000-000000000003', fullName: 'Marko Ilić' };
const BIOLOGY_STUDENTS = `/teacher/subjects/${biology5b.id}/students`;
const ANA_PATH = `${BIOLOGY_STUDENTS}/${ANA.id}`;
const MINE = testUsers.teacher;

function answerSubjects(subjects = [biology5b, math5a, math5b]) {
  server.use(
    http.get('*/api/subjects/mine', () => HttpResponse.json({ subjects, schoolYear: 2026 })),
  );
}

function ranking(subjectId: string, rows: [number, typeof ANA, number, number, number][]) {
  const answer: SubjectStudents = {
    subject: { id: subjectId, name: 'Predmet' },
    publishedLessons: 3,
    students: rows.map(([rank, student, completedLessons, automatic, teacher]) => ({
      rank,
      student,
      completedLessons,
      stars: { automatic, teacher },
    })),
  };
  return answer;
}

describe('The students of a subject', () => {
  it('shows a table with rank, name, finished lessons and stars, and links to each student', async () => {
    answerSubjects();
    server.use(
      http.get('*/api/subjects/:id/progress/students', () =>
        HttpResponse.json(
          ranking(biology5b.id, [
            [1, ANA, 3, 3, 1],
            [2, LUKA, 1, 1, 0],
            [2, MARKO, 1, 0, 1],
          ]),
        ),
      ),
    );
    renderApp({ path: BIOLOGY_STUDENTS });

    const table = await screen.findByRole('table', { name: 'Učenici, odjeljenje 5-2' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^1Ana Marković3 \/ 33 za lekcije, 1 od nastavnika/),
      expect.stringMatching(/^2Luka Stanić1 \/ 3/),
      // Equal students share the place.
      expect.stringMatching(/^2Marko Ilić1 \/ 3/),
    ]);
    expect(within(table).getByRole('link', { name: 'Ana Marković' })).toHaveAttribute(
      'href',
      ANA_PATH,
    );
    expect(screen.getByText(/Tabelu vidiš samo ti/)).toBeInTheDocument();
    // The odeljenje filter only appears when the subject has more than one.
    expect(screen.queryByRole('group', { name: 'Odjeljenje' })).not.toBeInTheDocument();
  });

  it('marks the Učenici tab as the current one, next to Lekcije', async () => {
    answerSubjects();
    server.use(
      http.get('*/api/subjects/:id/progress/students', () =>
        HttpResponse.json(ranking(biology5b.id, [])),
      ),
    );
    renderApp({ path: BIOLOGY_STUDENTS });

    const tabs = await screen.findByRole('navigation', { name: 'Predmet' });
    expect(within(tabs).getByRole('link', { name: 'Učenici' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(tabs).getByRole('link', { name: 'Lekcije' })).not.toHaveAttribute('aria-current');
  });

  it('says so when nobody has joined the subject', async () => {
    answerSubjects();
    server.use(
      http.get('*/api/subjects/:id/progress/students', () =>
        HttpResponse.json(ranking(biology5b.id, [])),
      ),
    );
    renderApp({ path: BIOLOGY_STUDENTS });

    expect(await screen.findByText(/još nije upisan nijedan učenik/)).toBeInTheDocument();
  });

  it('explains that there is nothing to follow before a lesson is published', async () => {
    answerSubjects();
    server.use(
      http.get('*/api/subjects/:id/progress/students', () =>
        HttpResponse.json({ ...ranking(biology5b.id, [[1, ANA, 0, 0, 0]]), publishedLessons: 0 }),
      ),
    );
    renderApp({ path: BIOLOGY_STUDENTS });

    expect(await screen.findByText(/Još nema objavljenih lekcija/)).toBeInTheDocument();
  });

  it('offers a retry when the table cannot be loaded', async () => {
    answerSubjects();
    let calls = 0;
    server.use(
      http.get('*/api/subjects/:id/progress/students', () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(apiError('internal_error'), { status: 500 })
          : HttpResponse.json(ranking(biology5b.id, [[1, ANA, 1, 1, 0]]));
      }),
    );
    const { user } = renderApp({ path: BIOLOGY_STUDENTS });

    expect(await screen.findByRole('alert')).toHaveTextContent('Nije moguće učitati podatke');
    await user.click(screen.getByRole('button', { name: 'Pokušaj ponovo' }));
    expect(await screen.findByRole('link', { name: 'Ana Marković' })).toBeInTheDocument();
  });

  describe('a subject taught in several odeljenja', () => {
    const MATH_STUDENTS = `/teacher/subjects/${math5a.id}/students`;

    function answerRankings() {
      const asked: string[] = [];
      server.use(
        http.get('*/api/subjects/:id/progress/students', ({ params }) => {
          const id = String(params.id);
          asked.push(id);
          return HttpResponse.json(
            id === math5a.id ? ranking(id, [[1, ANA, 2, 2, 0]]) : ranking(id, [[1, LUKA, 1, 1, 0]]),
          );
        }),
      );
      return asked;
    }

    it('starts with the odeljenje that was opened and lets the teacher pick another', async () => {
      answerSubjects();
      const asked = answerRankings();
      const { user, router } = renderApp({ path: MATH_STUDENTS });

      const filter = await screen.findByRole('group', { name: 'Odjeljenje' });
      expect(within(filter).getByRole('button', { name: '5-1' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(await screen.findByRole('link', { name: 'Ana Marković' })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Luka Stanić' })).not.toBeInTheDocument();
      expect(asked).toEqual([math5a.id]);

      await user.click(within(filter).getByRole('button', { name: '5-2' }));

      expect(await screen.findByRole('link', { name: 'Luka Stanić' })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Ana Marković' })).not.toBeInTheDocument();
      expect(router.state.location.search).toBe(`?odjeljenje=${math5b.id}`);
    });

    it('shows every odeljenje, each with its own table, under "Sva odjeljenja"', async () => {
      answerSubjects();
      answerRankings();
      const { user, router } = renderApp({ path: MATH_STUDENTS });

      await user.click(await screen.findByRole('button', { name: 'Sva odjeljenja' }));

      expect(
        await screen.findByRole('heading', { level: 2, name: 'Odjeljenje 5-1' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Odjeljenje 5-2' })).toBeInTheDocument();
      expect(
        await screen.findByRole('table', { name: 'Učenici, odjeljenje 5-1' }),
      ).toBeInTheDocument();
      expect(
        await screen.findByRole('table', { name: 'Učenici, odjeljenje 5-2' }),
      ).toBeInTheDocument();
      expect(router.state.location.search).toBe('?odjeljenje=sva');
    });

    it('opens on all odeljenja when the address says so', async () => {
      answerSubjects();
      answerRankings();
      renderApp({ path: `${MATH_STUDENTS}?odjeljenje=sva` });

      expect(await screen.findByRole('button', { name: 'Sva odjeljenja' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });

    it('falls back to its own odeljenje when the address names something else', async () => {
      answerSubjects();
      const asked = answerRankings();
      renderApp({ path: `${MATH_STUDENTS}?odjeljenje=nepostojece` });

      expect(await screen.findByRole('link', { name: 'Ana Marković' })).toBeInTheDocument();
      expect(asked).toEqual([math5a.id]);
    });
  });

  it('says it does not exist for a subject that is not the teacher’s', async () => {
    answerSubjects();
    renderApp({ path: '/teacher/subjects/00000000-0000-4000-8000-00000000dead/students' });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Predmet nije pronađen' }),
    ).toBeInTheDocument();
  });
});

describe('One student', () => {
  const progress = {
    student: ANA,
    subject: { id: biology5b.id, name: 'Biologija' },
    lessons: { published: 3, completed: 2 },
    stars: { automatic: 2, teacher: 1 },
    items: [
      { id: 'l1', title: 'Fotosinteza', completed: true, completedAt: '2026-11-03T10:00:00.000Z' },
      {
        id: 'l2',
        title: 'Disanje biljaka',
        completed: true,
        completedAt: '2026-11-04T10:00:00.000Z',
      },
      { id: 'l3', title: 'Ćelija', completed: false, completedAt: null },
    ],
  };

  const automaticStar: Star = {
    id: 's1',
    source: 'automatic',
    student: ANA,
    subject: { id: biology5b.id, name: 'Biologija' },
    lesson: { id: 'l1', title: 'Fotosinteza' },
    message: null,
    givenBy: null,
    createdAt: '2026-11-03T10:00:00.000Z',
  };
  const mineStar: Star = {
    id: 's2',
    source: 'teacher',
    student: ANA,
    subject: { id: biology5b.id, name: 'Biologija' },
    lesson: null,
    message: 'Lijepo si radila na času',
    givenBy: { id: MINE.id, fullName: MINE.fullName },
    createdAt: '2026-11-04T10:00:00.000Z',
  };
  const othersStar: Star = {
    ...mineStar,
    id: 's3',
    message: 'Pomogla je drugarici',
    givenBy: { id: 'another-teacher', fullName: 'Nenad Ilić' },
  };

  /** A fake server that keeps the stars, so giving and taking back show in the next answer. */
  function keepStars(initial: Star[]) {
    const state = { stars: initial, given: [] as unknown[], deleted: [] as string[] };
    const counts = () => ({
      automatic: state.stars.filter((star) => star.source === 'automatic').length,
      teacher: state.stars.filter((star) => star.source === 'teacher').length,
    });
    server.use(
      http.get('*/api/stars', () => HttpResponse.json({ stars: state.stars, counts: counts() })),
      http.post('*/api/stars', async ({ request }) => {
        const body = (await request.json()) as { message: string };
        state.given.push(body);
        const star: Star = {
          ...mineStar,
          id: `new-${state.stars.length}`,
          message: body.message,
        };
        state.stars = [star, ...state.stars];
        return HttpResponse.json({ star }, { status: 201 });
      }),
      http.delete('*/api/stars/:id', ({ params }) => {
        state.deleted.push(String(params.id));
        state.stars = state.stars.filter((star) => star.id !== params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    return state;
  }

  function openAna(stars: Star[] = [automaticStar, mineStar, othersStar]) {
    answerSubjects();
    server.use(http.get('*/api/subjects/:id/progress', () => HttpResponse.json(progress)));
    const state = keepStars(stars);
    return { state, ...renderApp({ path: ANA_PATH }) };
  }

  it('shows the progress as words and as a bar, and the lessons with a done mark', async () => {
    openAna();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ana Marković' }),
    ).toBeInTheDocument();
    expect(screen.getByText('2 od 3 lekcija')).toBeInTheDocument();
    const bar = screen.getByRole('progressbar', { name: 'Napredak: Ana Marković' });
    expect(bar).toHaveAttribute('aria-valuenow', '2');
    expect(bar).toHaveAttribute('aria-valuemax', '3');
    const lessons = screen.getByRole('region', { name: 'Lekcije' });
    expect(within(lessons).getByText('Završena 3. novembar 2026.')).toBeInTheDocument();
    expect(within(lessons).getByText('Nije završena')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Biologija · Odjeljenje 5-2 · Učenici/ }),
    ).toHaveAttribute('href', BIOLOGY_STUDENTS);
  });

  it('says the student is not found when they did not join the subject', async () => {
    answerSubjects();
    server.use(
      http.get('*/api/subjects/:id/progress', () =>
        HttpResponse.json(apiError('not_found'), { status: 404 }),
      ),
    );
    renderApp({ path: ANA_PATH });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Učenik nije pronađen' }),
    ).toBeInTheDocument();
  });

  describe('the quiz tries', () => {
    const history = {
      student: ANA,
      completedAt: null,
      attempts: [
        {
          id: 'a2',
          status: 'completed',
          startedAt: '2026-11-04T10:00:00.000Z',
          completedAt: '2026-11-04T10:05:00.000Z',
          allCorrect: true,
          answers: [
            {
              position: 1,
              kind: 'choice',
              prompt: 'Šta biljke prave?',
              chosenText: 'Hranu',
              correctText: 'Hranu',
              explanation: null,
              correct: true,
            },
          ],
        },
        {
          id: 'a1',
          status: 'completed',
          startedAt: '2026-11-03T10:00:00.000Z',
          completedAt: '2026-11-03T10:05:00.000Z',
          allCorrect: false,
          answers: [
            {
              position: 1,
              kind: 'choice',
              prompt: 'Šta biljke prave?',
              chosenText: 'Vodu',
              correctText: 'Hranu',
              explanation: 'Biljke prave hranu uz pomoć svjetlosti.',
              correct: false,
            },
          ],
        },
      ],
    };

    it('asks for them only when a lesson is opened, and shows every question and answer', async () => {
      const asked: string[] = [];
      server.use(
        http.get('*/api/lessons/:id/quiz/attempts', ({ params, request }) => {
          asked.push(`${params.id}?${new URL(request.url).searchParams.get('studentId')}`);
          return HttpResponse.json(history);
        }),
      );
      const { user } = openAna();
      await screen.findByText('2 od 3 lekcija');
      expect(asked).toEqual([]);

      await user.click(screen.getByRole('button', { name: /Pokušaji kviza.*Fotosinteza/ }));

      expect(await screen.findByText(/Pokušaj 1/)).toBeInTheDocument();
      expect(asked).toEqual([`l1?${ANA.id}`]);
      // The oldest try is number 1, and the newest is listed first.
      const attempts = screen.getAllByText(/^Pokušaj \d/, { exact: false });
      expect(attempts.map((item) => item.textContent)).toEqual([
        expect.stringContaining('Pokušaj 2'),
        expect.stringContaining('Pokušaj 1'),
      ]);
      expect(screen.getByText('Svi odgovori tačni', { exact: false })).toBeInTheDocument();
      expect(screen.getByText('Netačno: 1 od 1', { exact: false })).toBeInTheDocument();
      expect(screen.getByText(/Izabrao\/la je: Vodu · Tačan odgovor: Hranu/)).toBeInTheDocument();
      expect(
        screen.getByText('Objašnjenje: Biljke prave hranu uz pomoć svjetlosti.'),
      ).toBeInTheDocument();
    });

    it('says when the student has not tried the quiz', async () => {
      server.use(
        http.get('*/api/lessons/:id/quiz/attempts', () =>
          HttpResponse.json({ student: ANA, completedAt: null, attempts: [] }),
        ),
      );
      const { user } = openAna();

      await user.click(await screen.findByRole('button', { name: /Pokušaji kviza.*Ćelija/ }));

      expect(
        await screen.findByText('Učenik još nije pokušao kviz ove lekcije.'),
      ).toBeInTheDocument();
    });
  });

  describe('the stars', () => {
    it('shows both kinds, clearly named, with the message of the teacher', async () => {
      openAna();

      const stars = await screen.findByRole('region', { name: 'Zvjezdice' });
      await within(stars).findByText('Lijepo si radila na času');
      expect(within(stars).getByText('Za završene lekcije: 1')).toBeInTheDocument();
      expect(within(stars).getByText('Od nastavnika: 2')).toBeInTheDocument();
      expect(within(stars).getAllByText('Završena lekcija')).toHaveLength(1);
      expect(within(stars).getAllByText('Od nastavnika', { selector: 'p' })).toHaveLength(2);
      expect(
        within(stars).getByText('Dao/la Milica Petrović', { exact: false }),
      ).toBeInTheDocument();
    });

    it('gives a star with a message and shows it at once', async () => {
      const { user, state } = openAna([automaticStar]);
      const field = await screen.findByLabelText(/Poruka uz zvjezdicu/);

      await user.type(field, '  Pomogla drugarici ');
      expect(screen.getByText('20 od 200 znakova')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Daj zvjezdicu' }));

      expect(await screen.findByText('Zvjezdica je data.')).toBeInTheDocument();
      expect(state.given).toEqual([
        { studentId: ANA.id, subjectId: biology5b.id, message: 'Pomogla drugarici' },
      ]);
      expect(await screen.findByText('Pomogla drugarici')).toBeInTheDocument();
      expect(field).toHaveValue('');
      expect(screen.getByText('Od nastavnika: 1')).toBeInTheDocument();
    });

    it('asks for a message, and refuses one that is too long', async () => {
      const { user } = openAna([]);
      const field = await screen.findByLabelText(/Poruka uz zvjezdicu/);

      await user.click(screen.getByRole('button', { name: 'Daj zvjezdicu' }));
      expect(await screen.findByText('Napiši zašto daješ zvjezdicu.')).toBeInTheDocument();

      await user.type(field, 'x'.repeat(201));
      await user.click(screen.getByRole('button', { name: 'Daj zvjezdicu' }));
      expect(await screen.findByText('Poruka može imati najviše 200 znakova.')).toBeInTheDocument();
    });

    it('keeps the message and explains when the server refuses', async () => {
      const { user } = openAna([]);
      server.use(
        http.post('*/api/stars', () => HttpResponse.json(apiError('not_found'), { status: 404 })),
      );
      const field = await screen.findByLabelText(/Poruka uz zvjezdicu/);

      await user.type(field, 'Bravo');
      await user.click(screen.getByRole('button', { name: 'Daj zvjezdicu' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Ovo ne postoji');
      expect(field).toHaveValue('Bravo');
    });

    it('lets the teacher take back only a star they gave, after a question', async () => {
      const { user, state } = openAna();
      const stars = await screen.findByRole('region', { name: 'Zvjezdice' });
      await within(stars).findByText('Lijepo si radila na času');

      // One star is the teacher's own: the others (automatic, another teacher's) have no button.
      const buttons = within(stars).getAllByRole('button', { name: 'Povuci zvjezdicu' });
      expect(buttons).toHaveLength(1);

      await user.click(buttons[0]!);
      const dialog = await screen.findByRole('alertdialog', { name: 'Povući zvjezdicu?' });
      expect(state.deleted).toEqual([]);
      await user.click(within(dialog).getByRole('button', { name: 'Da, povuci' }));

      await waitFor(() => expect(state.deleted).toEqual(['s2']));
      await waitFor(() =>
        expect(within(stars).queryByText('Lijepo si radila na času')).not.toBeInTheDocument(),
      );
      expect(within(stars).getByText('Pomogla je drugarici')).toBeInTheDocument();
    });

    it('says there are no stars yet', async () => {
      openAna([]);
      expect(await screen.findByText('Još nema zvjezdica.')).toBeInTheDocument();
    });
  });
});

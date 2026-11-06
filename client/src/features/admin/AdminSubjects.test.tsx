import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { managedUser } from '@/test/adminApiFixtures';
import { apiError } from '@/test/authFixtures';
import { renderApp } from '@/test/renderApp';
import { server } from '@/test/server';
import type { SchoolClass } from './api/classesApi';
import type { AdminSubject } from './api/subjectsApi';
import type { ManagedUser } from './api/usersApi';

// The first of the school years is chosen by the date, so the date is fixed (the timers are not).
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-06T10:00:00Z'));
});
afterEach(() => vi.useRealTimers());

const class51: SchoolClass = {
  id: 'c1',
  name: '5-1',
  schoolYear: 2026,
  subjectCount: 1,
  createdAt: '2026-09-01T08:00:00.000Z',
};
const class52: SchoolClass = { ...class51, id: 'c2', name: '5-2', subjectCount: 0 };

const milica = managedUser({ id: 't1', fullName: 'Milica Petrović' });
const jovan = managedUser({
  id: 't2',
  fullName: 'Jovan Ilić',
  username: 'jovan_ilic',
  deactivatedAt: '2026-06-20T10:00:00.000Z',
});
const ivana = managedUser({ id: 't3', fullName: 'Ivana Kovač', username: 'ivana_kovac' });

const biology: AdminSubject = {
  id: 's1',
  name: 'Biologija',
  classId: 'c1',
  className: '5-1',
  schoolYear: 2026,
  teacher: { id: 't1', fullName: 'Milica Petrović', deactivated: false, deleted: false },
  createdAt: '2026-09-01T08:00:00.000Z',
};

interface Options {
  subjects?: AdminSubject[];
  classes?: SchoolClass[];
  teachers?: ManagedUser[];
  deleteFails?: string;
  total?: number;
}

/** A school that answers like the server and remembers what it was asked. */
function keepSubjects(options: Options = {}) {
  const state = {
    subjects: options.subjects ?? [biology],
    asked: [] as URLSearchParams[],
    sent: [] as { what: string; body?: unknown }[],
  };
  server.use(
    http.get('*/api/subjects', ({ request }) => {
      const query = new URL(request.url).searchParams;
      state.asked.push(query);
      return HttpResponse.json({
        subjects: state.subjects,
        total: options.total ?? state.subjects.length,
      });
    }),
    http.get('*/api/classes', () =>
      HttpResponse.json({ classes: options.classes ?? [class51, class52] }),
    ),
    http.get('*/api/users', () => {
      const teachers = options.teachers ?? [milica, jovan, ivana];
      return HttpResponse.json({ users: teachers, total: teachers.length });
    }),
    http.post('*/api/subjects', async ({ request }) => {
      const body = (await request.json()) as { name: string; classId: string; teacherId: string };
      state.sent.push({ what: 'POST', body });
      const created: AdminSubject = {
        ...biology,
        id: `new-${state.subjects.length}`,
        name: body.name,
        classId: body.classId,
      };
      state.subjects = [...state.subjects, created];
      return HttpResponse.json({ subject: created }, { status: 201 });
    }),
    http.patch('*/api/subjects/:id', async ({ request, params }) => {
      const body = (await request.json()) as { name?: string; teacherId?: string };
      state.sent.push({ what: `PATCH ${String(params.id)}`, body });
      state.subjects = state.subjects.map((subject) =>
        subject.id === params.id ? { ...subject, name: body.name ?? subject.name } : subject,
      );
      return HttpResponse.json({ subject: state.subjects.find((s) => s.id === params.id) });
    }),
    http.delete('*/api/subjects/:id', ({ params }) => {
      state.sent.push({ what: `DELETE ${String(params.id)}` });
      if (options.deleteFails) {
        return HttpResponse.json(apiError(options.deleteFails), { status: 409 });
      }
      state.subjects = state.subjects.filter((subject) => subject.id !== params.id);
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return state;
}

const rowsOf = async () =>
  within(screen.getByRole('region', { name: 'Lista predmeta' })).findAllByRole('listitem');

describe('Predmeti', () => {
  it('lists the subjects of the current school year with their odeljenje and teacher', async () => {
    const state = keepSubjects();
    renderApp({ path: '/admin/subjects' });

    const [row] = await rowsOf();
    expect(row).toHaveTextContent('Biologija');
    expect(row).toHaveTextContent('Odeljenje 5-1');
    expect(row).toHaveTextContent('Predaje: Milica Petrović');
    expect(state.asked[0]!.get('schoolYear')).toBe('2026');
    expect(state.asked[0]!.has('classId')).toBe(false);
    expect(state.asked[0]!.has('teacherId')).toBe(false);
    expect(screen.getByRole('link', { name: 'Predmeti' })).toHaveAttribute('aria-current', 'page');
  });

  it('warns when the teacher has left the school, and offers a new teacher', async () => {
    keepSubjects({
      subjects: [
        {
          ...biology,
          teacher: { id: 't2', fullName: 'Jovan Ilić', deactivated: true, deleted: false },
        },
      ],
    });
    renderApp({ path: '/admin/subjects' });

    const [row] = await rowsOf();
    expect(row).toHaveTextContent('Nastavnik je napustio školu. Izaberi novog.');
    expect(
      within(row!).getByRole('button', { name: 'Promijeni nastavnika: Biologija, 5-1' }),
    ).toBeInTheDocument();
  });

  it('does not show the name of a teacher whose data was erased', async () => {
    keepSubjects({
      subjects: [
        {
          ...biology,
          teacher: { id: 't9', fullName: 'Deleted user', deactivated: true, deleted: true },
        },
      ],
    });
    renderApp({ path: '/admin/subjects' });

    const [row] = await rowsOf();
    expect(row).toHaveTextContent('Predaje: Obrisan korisnik');
    expect(row).not.toHaveTextContent('Deleted user');
  });

  it('asks for the odeljenje and the teacher that were chosen, and forgets the odeljenje with the year', async () => {
    const state = keepSubjects();
    const { user } = renderApp({ path: '/admin/subjects' });
    await rowsOf();

    await user.selectOptions(
      screen.getByLabelText('Odeljenje', { selector: '#subjects-class' }),
      'c2',
    );
    await user.selectOptions(
      screen.getByLabelText('Nastavnik', { selector: '#subjects-teacher' }),
      't3',
    );

    await waitFor(() => {
      const last = state.asked[state.asked.length - 1]!;
      expect(last.get('classId')).toBe('c2');
      expect(last.get('teacherId')).toBe('t3');
    });

    await user.selectOptions(screen.getByLabelText('Školska godina'), '2025');

    await waitFor(() => {
      const last = state.asked[state.asked.length - 1]!;
      expect(last.get('schoolYear')).toBe('2025');
      expect(last.has('classId')).toBe(false);
      expect(last.get('teacherId')).toBe('t3');
    });
  });

  it('offers every teacher in the filter, also the one who left', async () => {
    keepSubjects();
    renderApp({ path: '/admin/subjects' });
    await rowsOf();

    const options = within(
      screen.getByLabelText('Nastavnik', { selector: '#subjects-teacher' }),
    ).getAllByRole('option');

    expect(options.map((option) => option.textContent)).toEqual([
      'Svi nastavnici',
      'Milica Petrović',
      'Jovan Ilić',
      'Ivana Kovač',
    ]);
  });

  it('opens with the year and the odeljenje from the link of the page of the odeljenja', async () => {
    const state = keepSubjects();
    renderApp({ path: '/admin/subjects?schoolYear=2025&classId=c1' });

    await rowsOf();
    expect(state.asked[0]!.get('schoolYear')).toBe('2025');
    expect(state.asked[0]!.get('classId')).toBe('c1');
  });

  it('tells nothing matches the filter, and that the year has no subjects at all', async () => {
    keepSubjects({ subjects: [] });
    const { user } = renderApp({ path: '/admin/subjects' });

    expect(
      await screen.findByText('U školskoj godini 2026/27 još nema predmeta.'),
    ).toBeInTheDocument();
    await user.selectOptions(
      screen.getByLabelText('Odeljenje', { selector: '#subjects-class' }),
      'c2',
    );

    expect(await screen.findByText('Nijedan predmet ne odgovara filteru.')).toBeInTheDocument();
  });

  it('shows more when there are more subjects than a page', async () => {
    const state = keepSubjects({ total: 60 });
    const { user } = renderApp({ path: '/admin/subjects' });

    expect(await screen.findByText('Prikazano 1 od 60')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Prikaži još' }));

    await waitFor(() => expect(state.asked[state.asked.length - 1]!.get('limit')).toBe('50'));
  });
});

describe('Adding a subject', () => {
  async function fill(user: ReturnType<typeof renderApp>['user'], name: string) {
    await user.type(await screen.findByLabelText('Naziv predmeta'), name);
    await user.selectOptions(
      screen.getByLabelText('Odeljenje', { selector: '#new-subject-class' }),
      'c2',
    );
    await user.selectOptions(
      screen.getByLabelText('Nastavnik', { selector: '#new-subject-teacher' }),
      't3',
    );
  }

  it('adds a subject with an active teacher, and keeps the odeljenje and the teacher for the next', async () => {
    const state = keepSubjects();
    const { user } = renderApp({ path: '/admin/subjects' });
    await rowsOf();

    await fill(user, ' Hemija ');
    await user.click(screen.getByRole('button', { name: 'Dodaj predmet' }));

    expect(await screen.findByText('Predmet Hemija je dodat.')).toBeInTheDocument();
    expect(state.sent).toEqual([
      { what: 'POST', body: { name: 'Hemija', classId: 'c2', teacherId: 't3' } },
    ]);
    expect(screen.getByLabelText('Naziv predmeta')).toHaveValue('');
    expect(screen.getByLabelText('Odeljenje', { selector: '#new-subject-class' })).toHaveValue(
      'c2',
    );
    expect(await rowsOf()).toHaveLength(2);
  });

  it('offers only teachers who are still at the school', async () => {
    keepSubjects();
    renderApp({ path: '/admin/subjects' });
    await rowsOf();

    const options = within(
      screen.getByLabelText('Nastavnik', { selector: '#new-subject-teacher' }),
    ).getAllByRole('option');

    expect(options.map((option) => option.textContent)).toEqual([
      'Izaberi nastavnika',
      'Milica Petrović',
      'Ivana Kovač',
    ]);
  });

  it('asks for a name, an odeljenje and a teacher before sending anything', async () => {
    const state = keepSubjects();
    const { user } = renderApp({ path: '/admin/subjects' });
    await rowsOf();

    await user.click(screen.getByRole('button', { name: 'Dodaj predmet' }));

    expect(await screen.findByText('Upiši naziv predmeta.')).toBeInTheDocument();
    expect(screen.getByText('Izaberi odeljenje.')).toBeInTheDocument();
    expect(screen.getByText('Izaberi nastavnika.')).toBeInTheDocument();
    expect(state.sent).toEqual([]);
  });

  it('says next to the name that the teacher already teaches it there', async () => {
    keepSubjects();
    server.use(
      http.post('*/api/subjects', () =>
        HttpResponse.json(apiError('subject_exists'), { status: 409 }),
      ),
    );
    const { user } = renderApp({ path: '/admin/subjects' });
    await rowsOf();

    await fill(user, 'Biologija');
    await user.click(screen.getByRole('button', { name: 'Dodaj predmet' }));

    await waitFor(() => expect(screen.getByLabelText('Naziv predmeta')).toBeInvalid());
    expect(screen.getByText(/već predaje predmet sa tim nazivom/)).toBeInTheDocument();
    expect(screen.getByLabelText('Naziv predmeta')).toHaveValue('Biologija');
  });

  it('points to the odeljenja when the year has none, and to a new account when there is no teacher', async () => {
    keepSubjects({ classes: [], teachers: [jovan] });
    renderApp({ path: '/admin/subjects' });

    expect(await screen.findByRole('link', { name: 'Idi na odeljenja' })).toHaveAttribute(
      'href',
      '/admin/classes',
    );
    // The menu has a "Novi nalog" too; this one is in the form for a new subject.
    expect(
      within(screen.getByRole('region', { name: 'Novi predmet' })).getByRole('link', {
        name: 'Novi nalog',
      }),
    ).toHaveAttribute('href', '/admin/users/new');
  });
});

describe('Changing a subject', () => {
  it('changes only the name when only the name is changed', async () => {
    const state = keepSubjects();
    const { user } = renderApp({ path: '/admin/subjects' });

    await user.click(
      await screen.findByRole('button', { name: 'Izmijeni predmet Biologija, 5-1' }),
    );
    const name = screen.getByLabelText('Naziv predmeta', { selector: '#edit-subject-s1-name' });
    await user.clear(name);
    await user.type(name, 'Biologija 5');
    await user.click(screen.getByRole('button', { name: 'Sačuvaj' }));

    expect(await screen.findByText('Predmet Biologija 5 je izmijenjen.')).toBeInTheDocument();
    expect(state.sent).toEqual([{ what: 'PATCH s1', body: { name: 'Biologija 5' } }]);
  });

  it('changes only the teacher when only the teacher is changed', async () => {
    const state = keepSubjects();
    const { user } = renderApp({ path: '/admin/subjects' });

    await user.click(
      await screen.findByRole('button', { name: 'Izmijeni predmet Biologija, 5-1' }),
    );
    await user.selectOptions(
      screen.getByLabelText('Nastavnik', { selector: '#edit-subject-s1-teacher' }),
      't3',
    );
    await user.click(screen.getByRole('button', { name: 'Sačuvaj' }));

    await waitFor(() =>
      expect(state.sent).toEqual([{ what: 'PATCH s1', body: { teacherId: 't3' } }]),
    );
  });

  it('says nothing was changed instead of sending an empty request', async () => {
    const state = keepSubjects();
    const { user } = renderApp({ path: '/admin/subjects' });

    await user.click(
      await screen.findByRole('button', { name: 'Izmijeni predmet Biologija, 5-1' }),
    );
    await user.click(screen.getByRole('button', { name: 'Sačuvaj' }));

    expect(await screen.findByText('Ništa nije izmijenjeno.')).toBeInTheDocument();
    expect(state.sent).toEqual([]);
  });

  it('lets a subject whose teacher left be renamed, and does not offer the teacher who left', async () => {
    const state = keepSubjects({
      subjects: [
        {
          ...biology,
          teacher: { id: 't2', fullName: 'Jovan Ilić', deactivated: true, deleted: false },
        },
      ],
    });
    const { user } = renderApp({ path: '/admin/subjects' });

    await user.click(
      await screen.findByRole('button', { name: 'Promijeni nastavnika: Biologija, 5-1' }),
    );
    const teacher = screen.getByLabelText('Nastavnik', { selector: '#edit-subject-s1-teacher' });
    expect(within(teacher).queryByRole('option', { name: 'Jovan Ilić' })).not.toBeInTheDocument();
    expect(teacher).toHaveValue('');
    expect(screen.getByText('Ostaje isti nastavnik dok ne izabereš novog.')).toBeInTheDocument();
    const name = screen.getByLabelText('Naziv predmeta', { selector: '#edit-subject-s1-name' });
    await user.clear(name);
    await user.type(name, 'Biologija 5');
    await user.click(screen.getByRole('button', { name: 'Sačuvaj' }));

    await waitFor(() =>
      expect(state.sent).toEqual([{ what: 'PATCH s1', body: { name: 'Biologija 5' } }]),
    );
  });
});

describe('Deleting a subject', () => {
  it('deletes it after a question', async () => {
    const state = keepSubjects();
    const { user } = renderApp({ path: '/admin/subjects' });

    await user.click(await screen.findByRole('button', { name: 'Obriši predmet Biologija, 5-1' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Obrisati predmet Biologija?');
    expect(state.sent).toEqual([]);
    await user.click(within(dialog).getByRole('button', { name: 'Da, obriši' }));

    expect(await screen.findByText('Predmet Biologija je obrisan.')).toBeInTheDocument();
    expect(state.sent).toEqual([{ what: 'DELETE s1' }]);
  });

  it.each([
    ['subject_has_enrollments', 'neko tražio da se upiše'],
    ['subject_has_lessons', 'ima lekcije'],
  ])('says why it was refused (%s)', async (code, words) => {
    keepSubjects({ deleteFails: code });
    const { user } = renderApp({ path: '/admin/subjects' });

    await user.click(await screen.findByRole('button', { name: 'Obriši predmet Biologija, 5-1' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Da, obriši' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(words);
    // The subject is still there.
    expect(screen.getAllByText('Biologija').length).toBeGreaterThan(0);
  });
});

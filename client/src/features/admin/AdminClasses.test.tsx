import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiError } from '@/test/authFixtures';
import { renderApp } from '@/test/renderApp';
import { server } from '@/test/server';
import type { SchoolClass } from './api/classesApi';

// The first of the school years is chosen by the date, so the date is fixed (the timers are not).
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-06T10:00:00Z'));
});
afterEach(() => vi.useRealTimers());

const schoolClass = (overrides: Partial<SchoolClass> = {}): SchoolClass => ({
  id: 'c1',
  name: '5-1',
  schoolYear: 2026,
  subjectCount: 0,
  createdAt: '2026-09-01T08:00:00.000Z',
  ...overrides,
});

/** A school that answers like the server: classes by year, a name once in a year. */
function keepClasses(initial: SchoolClass[], options: { deleteFails?: string } = {}) {
  const state = {
    classes: initial,
    asked: [] as string[],
    sent: [] as { what: string; body?: unknown }[],
  };
  server.use(
    http.get('*/api/classes', ({ request }) => {
      const year = new URL(request.url).searchParams.get('schoolYear')!;
      state.asked.push(year);
      return HttpResponse.json({
        classes: state.classes.filter((item) => item.schoolYear === Number(year)),
      });
    }),
    http.post('*/api/classes', async ({ request }) => {
      const body = (await request.json()) as { name: string; schoolYear: number };
      state.sent.push({ what: 'POST', body });
      if (state.classes.some((c) => c.name === body.name && c.schoolYear === body.schoolYear)) {
        return HttpResponse.json(apiError('class_exists'), { status: 409 });
      }
      const created = schoolClass({ id: `new-${state.classes.length}`, ...body });
      state.classes = [...state.classes, created];
      return HttpResponse.json({ class: created }, { status: 201 });
    }),
    http.patch('*/api/classes/:id', async ({ request, params }) => {
      const body = (await request.json()) as { name: string };
      state.sent.push({ what: `PATCH ${String(params.id)}`, body });
      if (state.classes.some((c) => c.name === body.name)) {
        return HttpResponse.json(apiError('class_exists'), { status: 409 });
      }
      state.classes = state.classes.map((c) => (c.id === params.id ? { ...c, ...body } : c));
      return HttpResponse.json({ class: state.classes.find((c) => c.id === params.id) });
    }),
    http.delete('*/api/classes/:id', ({ params }) => {
      state.sent.push({ what: `DELETE ${String(params.id)}` });
      if (options.deleteFails) {
        return HttpResponse.json(apiError(options.deleteFails), { status: 409 });
      }
      state.classes = state.classes.filter((c) => c.id !== params.id);
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return state;
}

const rowsOf = async () =>
  within(screen.getByRole('region', { name: 'Lista odeljenja' })).findAllByRole('listitem');

describe('Odeljenja', () => {
  it('lists the classes of the current school year, with how many subjects each has', async () => {
    const state = keepClasses([
      schoolClass(),
      schoolClass({ id: 'c2', name: '5-2', subjectCount: 3 }),
      schoolClass({ id: 'c3', name: '6-1', schoolYear: 2025, subjectCount: 1 }),
    ]);
    renderApp({ path: '/admin/classes' });

    const rows = await rowsOf();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('5-1');
    expect(rows[0]).toHaveTextContent('0 predmeta');
    expect(rows[1]).toHaveTextContent('5-2');
    expect(rows[1]).toHaveTextContent('3 predmeta');
    expect(state.asked[0]).toBe('2026');
    expect(screen.getByLabelText('Školska godina')).toHaveDisplayValue('2026/27 (tekuća)');
    expect(screen.getByRole('link', { name: 'Odeljenja' })).toHaveAttribute('aria-current', 'page');
  });

  it('links each class to its subjects, in the same school year', async () => {
    keepClasses([schoolClass()]);
    renderApp({ path: '/admin/classes' });

    expect(await screen.findByRole('link', { name: 'Predmeti odeljenja 5-1' })).toHaveAttribute(
      'href',
      '/admin/subjects?schoolYear=2026&classId=c1',
    );
  });

  it('offers the next year, to prepare it before September, and a few past ones', async () => {
    keepClasses([]);
    renderApp({ path: '/admin/classes' });

    const options = within(await screen.findByLabelText('Školska godina')).getAllByRole('option');

    expect(options.map((option) => option.textContent)).toEqual([
      '2027/28',
      '2026/27 (tekuća)',
      '2025/26',
      '2024/25',
      '2023/24',
    ]);
  });

  it('shows the classes of the year that is chosen', async () => {
    const state = keepClasses([schoolClass({ id: 'c3', name: '6-1', schoolYear: 2025 })]);
    const { user } = renderApp({ path: '/admin/classes' });

    expect(
      await screen.findByText('U školskoj godini 2026/27 još nema odeljenja.'),
    ).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Školska godina'), '2025');

    expect((await rowsOf())[0]).toHaveTextContent('6-1');
    expect(state.asked).toContain('2025');
  });

  it('offers a retry when the list cannot be loaded', async () => {
    let calls = 0;
    server.use(
      http.get('*/api/classes', () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(apiError('internal_error'), { status: 500 })
          : HttpResponse.json({ classes: [schoolClass()] });
      }),
    );
    const { user } = renderApp({ path: '/admin/classes' });

    await user.click(await screen.findByRole('button', { name: 'Pokušaj ponovo' }));

    expect((await rowsOf())[0]).toHaveTextContent('5-1');
  });
});

describe('Adding a class', () => {
  it('adds it to the year on the screen', async () => {
    const state = keepClasses([]);
    const { user } = renderApp({ path: '/admin/classes' });
    await user.selectOptions(await screen.findByLabelText('Školska godina'), '2027');

    expect(await screen.findByText('Biće dodato u školsku godinu 2027/28.')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Naziv odeljenja/), ' 5-3 ');
    await user.click(screen.getByRole('button', { name: 'Dodaj odeljenje' }));

    expect(await screen.findByText('Odeljenje 5-3 je dodato.')).toBeInTheDocument();
    expect(state.sent).toEqual([{ what: 'POST', body: { name: '5-3', schoolYear: 2027 } }]);
    expect((await rowsOf())[0]).toHaveTextContent('5-3');
    expect(screen.getByLabelText(/Naziv odeljenja/)).toHaveValue('');
  });

  it('asks for a name before sending anything', async () => {
    const state = keepClasses([]);
    const { user } = renderApp({ path: '/admin/classes' });

    await user.click(await screen.findByRole('button', { name: 'Dodaj odeljenje' }));

    expect(await screen.findByText('Upiši naziv odeljenja.')).toBeInTheDocument();
    expect(state.sent).toEqual([]);
  });

  it('says next to the name that the class exists, and keeps what was typed', async () => {
    keepClasses([schoolClass()]);
    const { user } = renderApp({ path: '/admin/classes' });
    await screen.findByText('0 predmeta');

    await user.type(screen.getByLabelText(/Naziv odeljenja/), '5-1');
    await user.click(screen.getByRole('button', { name: 'Dodaj odeljenje' }));

    const field = screen.getByLabelText(/Naziv odeljenja/);
    await waitFor(() => expect(field).toBeInvalid());
    expect(screen.getByText(/već postoji odeljenje sa tim nazivom/)).toBeInTheDocument();
    expect(field).toHaveValue('5-1');
  });
});

describe('Renaming and deleting a class', () => {
  it('renames a class', async () => {
    const state = keepClasses([schoolClass()]);
    const { user } = renderApp({ path: '/admin/classes' });

    await user.click(await screen.findByRole('button', { name: 'Izmijeni naziv: 5-1' }));
    const field = screen.getByLabelText('Naziv odeljenja', { selector: '#rename-class-c1' });
    await user.clear(field);
    await user.type(field, '5-4');
    await user.click(screen.getByRole('button', { name: 'Sačuvaj' }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Sačuvaj' })).not.toBeInTheDocument(),
    );
    expect((await rowsOf())[0]).toHaveTextContent('5-4');
    expect(state.sent).toEqual([{ what: 'PATCH c1', body: { name: '5-4' } }]);
  });

  it('keeps the form open and says when the new name is taken', async () => {
    keepClasses([schoolClass(), schoolClass({ id: 'c2', name: '5-2' })]);
    const { user } = renderApp({ path: '/admin/classes' });

    await user.click(await screen.findByRole('button', { name: 'Izmijeni naziv: 5-1' }));
    const field = screen.getByLabelText('Naziv odeljenja', { selector: '#rename-class-c1' });
    await user.clear(field);
    await user.type(field, '5-2');
    await user.click(screen.getByRole('button', { name: 'Sačuvaj' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('već postoji odeljenje');
    expect(field).toBeInTheDocument();
  });

  it('deletes an empty class after a question', async () => {
    const state = keepClasses([schoolClass()]);
    const { user } = renderApp({ path: '/admin/classes' });

    await user.click(await screen.findByRole('button', { name: 'Obriši odeljenje 5-1' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Obrisati odeljenje 5-1?');
    expect(state.sent).toEqual([]);
    await user.click(within(dialog).getByRole('button', { name: 'Da, obriši' }));

    expect(await screen.findByText('Odeljenje 5-1 je obrisano.')).toBeInTheDocument();
    expect(state.sent).toEqual([{ what: 'DELETE c1' }]);
    expect(await screen.findByText(/još nema odeljenja/)).toBeInTheDocument();
  });

  it('does not delete when the question is answered with Odustani', async () => {
    const state = keepClasses([schoolClass()]);
    const { user } = renderApp({ path: '/admin/classes' });

    await user.click(await screen.findByRole('button', { name: 'Obriši odeljenje 5-1' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Odustani' }),
    );

    expect(state.sent).toEqual([]);
    expect(screen.getByText('5-1')).toBeInTheDocument();
  });

  it('does not offer to delete a class that has subjects', async () => {
    keepClasses([schoolClass({ subjectCount: 2 })]);
    renderApp({ path: '/admin/classes' });

    expect(await screen.findByText('Ne može se obrisati dok ima predmete.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Obriši odeljenje/ })).not.toBeInTheDocument();
  });

  it('says why the server refused, when subjects were added in the meantime', async () => {
    keepClasses([schoolClass()], { deleteFails: 'class_not_empty' });
    const { user } = renderApp({ path: '/admin/classes' });

    await user.click(await screen.findByRole('button', { name: 'Obriši odeljenje 5-1' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Da, obriši' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Odeljenje ima predmete');
  });
});

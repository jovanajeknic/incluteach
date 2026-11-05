import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { Enrollment } from '@/features/subject-requests/api/enrollmentsApi';
import { apiError } from '@/test/authFixtures';
import { biology5b } from '@/test/lessonApiFixtures';
import { renderApp } from '@/test/renderApp';
import { server } from '@/test/server';

function request(overrides: Partial<Enrollment> = {}): Enrollment {
  return {
    id: 'e1',
    status: 'awaiting_teacher',
    student: { id: 'st1', fullName: 'Luka Stanić' },
    subject: {
      id: biology5b.id,
      name: 'Biologija',
      className: '5-2',
      schoolYear: 2026,
    },
    requestedBy: 'student',
    parentDecidedAt: '2026-11-04T10:00:00.000Z',
    teacherDecidedAt: null,
    createdAt: '2026-11-03T10:00:00.000Z',
    ...overrides,
  };
}

/** A fake server that keeps the waiting requests, so an answer shows in the next list. */
function keepRequests(initial: Enrollment[]) {
  const state = { waiting: initial, answered: [] as string[], asked: 0 };
  server.use(
    http.get('*/api/enrollments', ({ request: incoming }) => {
      state.asked += 1;
      expect(new URL(incoming.url).searchParams.get('status')).toBe('awaiting_teacher');
      return HttpResponse.json({ enrollments: state.waiting, total: state.waiting.length });
    }),
    http.post('*/api/enrollments/:id/:action', ({ params }) => {
      state.answered.push(`${String(params.action)}:${String(params.id)}`);
      state.waiting = state.waiting.filter((item) => item.id !== params.id);
      return HttpResponse.json({ enrollment: request({ id: String(params.id) }) });
    }),
    http.get('*/api/subjects/mine', () =>
      HttpResponse.json({ subjects: [biology5b], schoolYear: 2026 }),
    ),
  );
  return state;
}

describe('Zahtjevi za predmete', () => {
  it('lists who wants to join which subject, who asked and when', async () => {
    keepRequests([
      request(),
      request({
        id: 'e2',
        student: { id: 'st2', fullName: 'Mia Petrović' },
        requestedBy: 'parent',
      }),
    ]);
    renderApp({ path: '/teacher/requests' });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Zahtjevi za predmete' }),
    ).toBeInTheDocument();
    await screen.findByText('Mia Petrović');
    const cards = screen.getAllByRole('listitem');
    const luka = cards.find((card) => card.textContent?.includes('Luka Stanić'))!;
    expect(luka).toHaveTextContent('Biologija · Odjeljenje 5-2');
    expect(luka).toHaveTextContent('Zatražio/la učenik, potvrdio roditelj');
    expect(luka).toHaveTextContent('3. novembar 2026.');
    expect(within(luka).getByRole('link', { name: /Biologija/ })).toHaveAttribute(
      'href',
      `/teacher/subjects/${biology5b.id}`,
    );
    expect(cards.find((card) => card.textContent?.includes('Mia Petrović'))).toHaveTextContent(
      'Zatražio roditelj',
    );
  });

  it('shows the number of waiting requests in the menu, on every teacher page', async () => {
    keepRequests([request(), request({ id: 'e2' })]);
    server.use(
      http.get('*/api/subjects/mine', () => HttpResponse.json({ subjects: [], schoolYear: 2026 })),
    );
    renderApp({ path: '/teacher' });

    const link = await screen.findByRole('link', { name: /Zahtjevi/ });
    await waitFor(() => expect(link).toHaveTextContent('2 na čekanju'));
  });

  it('says so when nothing waits', async () => {
    keepRequests([]);
    renderApp({ path: '/teacher/requests' });

    expect(await screen.findByText('Nijedan zahtjev ne čeka tvoj odgovor.')).toBeInTheDocument();
    // No number in the menu when there is nothing to answer.
    expect(screen.getByRole('link', { name: 'Zahtjevi' })).toBeInTheDocument();
  });

  it('approves a request: it leaves the list and the menu number goes down', async () => {
    const state = keepRequests([
      request(),
      request({ id: 'e2', student: { id: 'st2', fullName: 'Mia Petrović' } }),
    ]);
    const { user } = renderApp({ path: '/teacher/requests' });

    await user.click(await screen.findByRole('button', { name: 'Odobri: Luka Stanić, Biologija' }));

    await waitFor(() => expect(screen.queryByText('Luka Stanić')).not.toBeInTheDocument());
    expect(state.answered).toEqual(['approve:e1']);
    expect(screen.getByText('Mia Petrović')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /Zahtjevi/ })).toHaveTextContent('1 na čekanju'),
    );
  });

  it('asks before rejecting, and cancelling changes nothing', async () => {
    const state = keepRequests([request()]);
    const { user } = renderApp({ path: '/teacher/requests' });

    await user.click(await screen.findByRole('button', { name: 'Odbij: Luka Stanić, Biologija' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Odbiti zahtjev?' });
    expect(dialog).toHaveTextContent('može ponovo poslati zahtjev');
    await user.click(within(dialog).getByRole('button', { name: 'Odustani' }));

    expect(state.answered).toEqual([]);
    expect(screen.getByText('Luka Stanić')).toBeInTheDocument();
  });

  it('rejects after the confirmation', async () => {
    const state = keepRequests([request()]);
    const { user } = renderApp({ path: '/teacher/requests' });

    await user.click(await screen.findByRole('button', { name: 'Odbij: Luka Stanić, Biologija' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Da, odbij' }),
    );

    await waitFor(() => expect(state.answered).toEqual(['reject:e1']));
    await waitFor(() => expect(screen.queryByText('Luka Stanić')).not.toBeInTheDocument());
    expect(await screen.findByText('Nijedan zahtjev ne čeka tvoj odgovor.')).toBeInTheDocument();
  });

  it('tells that the request was already answered, and refreshes the list', async () => {
    const state = keepRequests([request()]);
    server.use(
      http.post('*/api/enrollments/:id/:action', () => {
        // The other parent answered first: the server no longer lists it.
        state.waiting = [];
        return HttpResponse.json(apiError('wrong_state'), { status: 409 });
      }),
    );
    const { user } = renderApp({ path: '/teacher/requests' });

    await user.click(await screen.findByRole('button', { name: 'Odobri: Luka Stanić, Biologija' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Zahtjev je već obrađen');
    await waitFor(() => expect(screen.queryByText('Luka Stanić')).not.toBeInTheDocument());
    // The message stays although the card is gone.
    expect(screen.getByRole('alert')).toHaveTextContent('Zahtjev je već obrađen');
  });

  it('explains other failures and keeps the request', async () => {
    keepRequests([request()]);
    server.use(http.post('*/api/enrollments/:id/:action', () => HttpResponse.error()));
    const { user } = renderApp({ path: '/teacher/requests' });

    await user.click(await screen.findByRole('button', { name: 'Odobri: Luka Stanić, Biologija' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Server trenutno nije dostupan');
    expect(screen.getByText('Luka Stanić')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Odobri: Luka Stanić, Biologija' })).toBeEnabled();
  });

  it('offers a retry when the list cannot be loaded', async () => {
    let calls = 0;
    server.use(
      http.get('*/api/enrollments', () => {
        calls += 1;
        // The menu and the page share one request, so only the first one fails.
        return calls === 1
          ? HttpResponse.json(apiError('internal_error'), { status: 500 })
          : HttpResponse.json({ enrollments: [request()], total: 1 });
      }),
    );
    const { user } = renderApp({ path: '/teacher/requests' });

    await user.click(await screen.findByRole('button', { name: 'Pokušaj ponovo' }));

    expect(await screen.findByText('Luka Stanić')).toBeInTheDocument();
  });
});

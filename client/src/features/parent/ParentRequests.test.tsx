import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { Enrollment } from '@/features/subject-requests/api/enrollmentsApi';
import { apiError } from '@/test/authFixtures';
import { renderApp } from '@/test/renderApp';
import { server } from '@/test/server';
import { enrollmentOf } from '@/test/studentApiFixtures';

const ANA = { id: '40000000-0000-4000-8000-000000000001', fullName: 'Ana Marković' };
const LUKA = { id: '40000000-0000-4000-8000-000000000002', fullName: 'Luka Marković' };

const request = (child: typeof ANA, overrides: Partial<Enrollment> = {}) =>
  enrollmentOf({
    id: `r-${child.id.slice(-1)}`,
    status: 'awaiting_parent',
    student: child,
    parentDecidedAt: null,
    teacherDecidedAt: null,
    ...overrides,
  });

/** A fake server that keeps the requests that wait for a parent, so an answer shows next time. */
function keepRequests(initial: Enrollment[]) {
  const state = { waiting: initial, answered: [] as string[], statuses: [] as (string | null)[] };
  server.use(
    http.get('*/api/enrollments', ({ request: incoming }) => {
      state.statuses.push(new URL(incoming.url).searchParams.get('status'));
      return HttpResponse.json({ enrollments: state.waiting, total: state.waiting.length });
    }),
    http.post('*/api/enrollments/:id/:action', ({ params }) => {
      state.answered.push(`${String(params.action)}:${String(params.id)}`);
      state.waiting = state.waiting.filter((item) => item.id !== params.id);
      return HttpResponse.json({ enrollment: request(ANA, { id: String(params.id) }) });
    }),
    http.get('*/api/children', () => HttpResponse.json({ children: [ANA, LUKA] })),
  );
  return state;
}

describe('Zahtjevi za potvrdu', () => {
  it('lists the requests of the children that wait for the parent, with the child and the subject', async () => {
    const state = keepRequests([request(ANA), request(LUKA, { requestedBy: 'student' })]);
    renderApp({ path: '/parent/requests' });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Zahtjevi za potvrdu' }),
    ).toBeInTheDocument();
    const cards = await screen.findAllByText(/želi da bude upisan\/a na/);
    expect(cards).toHaveLength(2);
    const ana = (await screen.findByText('Ana Marković')).closest('div.rounded-3xl')!;
    expect(ana).toHaveTextContent('Biologija · Odjeljenje 5-2');
    expect(ana).toHaveTextContent('Zatražilo dijete');
    // A parent has no page for the subject, so the name is not a link.
    expect(within(ana as HTMLElement).queryByRole('link')).not.toBeInTheDocument();
    expect(state.statuses).toContain('awaiting_parent');
  });

  it('shows the number of waiting requests next to the menu item', async () => {
    keepRequests([request(ANA), request(LUKA)]);
    renderApp({ path: '/parent' });

    const link = await screen.findByRole('link', { name: /Zahtjevi/ });
    await waitFor(() => expect(link).toHaveTextContent('2 na čekanju'));
  });

  it('confirms a request: it leaves the list, and the number in the menu goes down', async () => {
    const state = keepRequests([request(ANA), request(LUKA)]);
    const { user } = renderApp({ path: '/parent/requests' });

    await user.click(
      await screen.findByRole('button', { name: 'Potvrdi: Ana Marković, Biologija' }),
    );

    await waitFor(() => expect(screen.queryByText('Ana Marković')).not.toBeInTheDocument());
    expect(state.answered).toEqual(['approve:r-1']);
    expect(screen.getByText('Luka Marković')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /Zahtjevi/ })).toHaveTextContent('1 na čekanju'),
    );
  });

  it('asks before rejecting, and cancelling changes nothing', async () => {
    const state = keepRequests([request(ANA)]);
    const { user } = renderApp({ path: '/parent/requests' });

    await user.click(await screen.findByRole('button', { name: 'Odbij: Ana Marković, Biologija' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Odbiti zahtjev?' });
    expect(dialog).toHaveTextContent('može ponovo poslati zahtjev');
    await user.click(within(dialog).getByRole('button', { name: 'Odustani' }));

    expect(state.answered).toEqual([]);
    expect(screen.getByText('Ana Marković')).toBeInTheDocument();
  });

  it('rejects after the confirmation', async () => {
    const state = keepRequests([request(ANA)]);
    const { user } = renderApp({ path: '/parent/requests' });

    await user.click(await screen.findByRole('button', { name: 'Odbij: Ana Marković, Biologija' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Da, odbij' }),
    );

    await waitFor(() => expect(state.answered).toEqual(['reject:r-1']));
    expect(await screen.findByText('Nijedan zahtjev ne čeka tvoj odgovor.')).toBeInTheDocument();
  });

  it('tells that the other parent was first, and refreshes the list', async () => {
    const state = keepRequests([request(ANA)]);
    server.use(
      http.post('*/api/enrollments/:id/:action', () => {
        state.waiting = [];
        return HttpResponse.json(apiError('wrong_state'), { status: 409 });
      }),
    );
    const { user } = renderApp({ path: '/parent/requests' });

    await user.click(
      await screen.findByRole('button', { name: 'Potvrdi: Ana Marković, Biologija' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'možda ga je drugi roditelj potvrdio',
    );
    await waitFor(() => expect(screen.queryByText('Ana Marković')).not.toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent('drugi roditelj');
  });

  it('says so when nothing waits', async () => {
    keepRequests([]);
    renderApp({ path: '/parent/requests' });

    expect(await screen.findByText('Nijedan zahtjev ne čeka tvoj odgovor.')).toBeInTheDocument();
  });

  it('explains other failures and keeps the request', async () => {
    keepRequests([request(ANA)]);
    server.use(http.post('*/api/enrollments/:id/:action', () => HttpResponse.error()));
    const { user } = renderApp({ path: '/parent/requests' });

    await user.click(
      await screen.findByRole('button', { name: 'Potvrdi: Ana Marković, Biologija' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Server trenutno nije dostupan');
    expect(screen.getByText('Ana Marković')).toBeInTheDocument();
  });

  it('leads there from the home page when requests wait', async () => {
    keepRequests([request(ANA)]);
    server.use(
      http.get('*/api/subjects/:id/progress', () =>
        HttpResponse.json({
          student: ANA,
          subject: { id: 's', name: 'Biologija' },
          lessons: { published: 0, completed: 0 },
          stars: { automatic: 0, teacher: 0 },
          items: [],
        }),
      ),
    );
    renderApp({ path: '/parent' });

    const link = await screen.findByRole('link', { name: '1 zahtjev čeka tvoj odgovor' });
    expect(link).toHaveAttribute('href', '/parent/requests');
  });
});

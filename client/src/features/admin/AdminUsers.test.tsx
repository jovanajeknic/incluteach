import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { apiError } from '@/test/authFixtures';
import { managedUser } from '@/test/adminApiFixtures';
import { renderApp } from '@/test/renderApp';
import { server } from '@/test/server';
import type { ManagedUser } from './api/usersApi';

/** Answers `GET /users` with `users` and keeps the queries the screen asked. */
function answerUsers(users: ManagedUser[], total = users.length) {
  const asked: URLSearchParams[] = [];
  server.use(
    http.get('*/api/users', ({ request }) => {
      asked.push(new URL(request.url).searchParams);
      return HttpResponse.json({ users, total });
    }),
  );
  return asked;
}

describe('The admin area', () => {
  it('opens on the users, and the menu and the person come from the session', async () => {
    answerUsers([managedUser()]);
    const { router } = renderApp({ path: '/admin' });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Korisnici škole' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin/users');
    expect(screen.getByRole('link', { name: 'Korisnici' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Marija Demić')).toBeInTheDocument();
    expect(screen.getByText('Administrator')).toBeInTheDocument();
  });

  it('says a page does not exist for an address it does not know', async () => {
    renderApp({ path: '/admin/nepoznato' });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Stranica nije pronađena' }),
    ).toBeInTheDocument();
  });
});

describe('Korisnici', () => {
  it('lists the active users, and says who has not activated the account yet', async () => {
    const asked = answerUsers([
      managedUser(),
      managedUser({
        id: 'u2',
        username: 'ana_markovic',
        fullName: 'Ana Marković',
        email: null,
        role: 'student',
        activated: false,
      }),
    ]);
    renderApp({ path: '/admin/users' });

    const rows = await within(
      screen.getByRole('region', { name: 'Lista korisnika' }),
    ).findAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Milica Petrović');
    expect(rows[0]).toHaveTextContent('Korisničko ime: milica_petrovic');
    expect(rows[0]).toHaveTextContent('milica@primjer.me');
    expect(rows[0]).toHaveTextContent('Nastavnik');
    expect(rows[0]).not.toHaveTextContent('Nije aktiviran');
    expect(rows[1]).toHaveTextContent('Ana Marković');
    expect(rows[1]).toHaveTextContent('Učenik');
    expect(rows[1]).toHaveTextContent('Bez emaila');
    expect(rows[1]).toHaveTextContent('Nije aktiviran');
    // By default only the active people, a page at a time.
    expect(asked[0]!.get('status')).toBe('active');
    expect(asked[0]!.get('limit')).toBe('25');
    expect(asked[0]!.has('role')).toBe(false);
    expect(asked[0]!.has('search')).toBe(false);
  });

  it('marks a deactivated user with a word', async () => {
    answerUsers([managedUser({ deactivatedAt: '2026-06-20T10:00:00.000Z' })]);
    const { user } = renderApp({ path: '/admin/users' });

    await user.selectOptions(await screen.findByLabelText('Stanje'), 'deactivated');

    expect(await screen.findByText('Deaktiviran')).toBeInTheDocument();
  });

  it('asks the server for the role, the state and the search that were chosen', async () => {
    const asked = answerUsers([managedUser()]);
    const { user } = renderApp({ path: '/admin/users' });

    await user.selectOptions(await screen.findByLabelText('Uloga'), 'parent');
    await user.selectOptions(screen.getByLabelText('Stanje'), 'all');
    await user.type(screen.getByLabelText(/Pretraga/), '  petar ');

    await waitFor(() => {
      const last = asked[asked.length - 1]!;
      expect(last.get('role')).toBe('parent');
      expect(last.get('status')).toBe('all');
      expect(last.get('search')).toBe('petar');
    });
    // Typing is not one request for every letter.
    expect(asked.filter((query) => query.has('search')).length).toBeLessThan(3);
  });

  it('shows more when there are more users than a page', async () => {
    const asked = answerUsers([managedUser()], 60);
    const { user } = renderApp({ path: '/admin/users' });

    expect(await screen.findByText('Prikazano 1 od 60')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Prikaži još' }));

    await waitFor(() => expect(asked[asked.length - 1]!.get('limit')).toBe('50'));
  });

  it('does not offer more when everything is shown', async () => {
    answerUsers([managedUser()]);
    renderApp({ path: '/admin/users' });

    await screen.findByText('Milica Petrović');
    expect(screen.queryByRole('button', { name: 'Prikaži još' })).not.toBeInTheDocument();
  });

  it('tells the school has no accounts yet, and tells a filter found nobody', async () => {
    answerUsers([]);
    const { user } = renderApp({ path: '/admin/users' });

    expect(await screen.findByText('U školi još nema naloga.')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Uloga'), 'student');

    expect(await screen.findByText('Nijedan nalog ne odgovara filteru.')).toBeInTheDocument();
  });

  it('offers a retry when the list cannot be loaded', async () => {
    let calls = 0;
    server.use(
      http.get('*/api/users', () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(apiError('internal_error'), { status: 500 })
          : HttpResponse.json({ users: [managedUser()], total: 1 });
      }),
    );
    const { user } = renderApp({ path: '/admin/users' });

    await user.click(await screen.findByRole('button', { name: 'Pokušaj ponovo' }));

    expect(await screen.findByText('Milica Petrović')).toBeInTheDocument();
  });
});

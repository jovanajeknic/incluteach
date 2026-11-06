import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { apiError, testUsers } from '@/test/authFixtures';
import { managedUser } from '@/test/adminApiFixtures';
import { renderApp } from '@/test/renderApp';
import { server } from '@/test/server';
import { usersApi, type ManagedUser } from './api/usersApi';

const LEFT = '2026-06-20T10:00:00.000Z';

const milica = managedUser({ id: 'u1' });
const ana = managedUser({
  id: 'u2',
  username: 'ana_markovic',
  fullName: 'Ana Marković',
  role: 'student',
});
const petar = managedUser({
  id: 'u3',
  username: 'petar_markovic',
  fullName: 'Petar Marković',
  role: 'parent',
  deactivatedAt: LEFT,
});
const me = managedUser({
  id: testUsers.admin.id,
  username: testUsers.admin.username,
  fullName: testUsers.admin.fullName,
  role: 'admin',
});

/** A school that answers like the server: it lists by state and applies what is asked. */
function keepSchool(initial: ManagedUser[], options: { skip?: string[]; fail?: string } = {}) {
  const state = {
    users: initial,
    sent: [] as { path: string; body: unknown }[],
  };
  const apply = (path: string, change: (user: ManagedUser) => ManagedUser | null) =>
    http.post(`*/api/users/${path}`, async ({ request }) => {
      const body = (await request.json()) as { ids: string[] };
      state.sent.push({ path, body });
      if (options.fail) return HttpResponse.json(apiError(options.fail), { status: 500 });
      const skippedIds = body.ids.filter((id) => options.skip?.includes(id));
      const affectedIds = body.ids.filter((id) => !skippedIds.includes(id));
      state.users = state.users.flatMap((user) => {
        if (!affectedIds.includes(user.id)) return [user];
        const changed = change(user);
        return changed ? [changed] : [];
      });
      return HttpResponse.json({ affectedIds, skippedIds });
    });
  server.use(
    http.get('*/api/users', ({ request }) => {
      const query = new URL(request.url).searchParams;
      const status = query.get('status');
      const users = state.users.filter(
        (user) =>
          (status === 'all' || Boolean(user.deactivatedAt) === (status === 'deactivated')) &&
          (!query.get('role') || user.role === query.get('role')),
      );
      return HttpResponse.json({ users, total: users.length });
    }),
    http.patch('*/api/users/:id', async ({ request, params }) => {
      const body = (await request.json()) as { fullName: string };
      state.sent.push({ path: `PATCH ${String(params.id)}`, body });
      if (options.fail) return HttpResponse.json(apiError(options.fail), { status: 400 });
      state.users = state.users.map((user) =>
        user.id === params.id ? { ...user, fullName: body.fullName } : user,
      );
      return HttpResponse.json({ user: state.users.find((user) => user.id === params.id) });
    }),
    apply('deactivate', (user) => ({ ...user, deactivatedAt: LEFT })),
    apply('reactivate', (user) => ({ ...user, deactivatedAt: null })),
    apply('delete', () => null),
  );
  return state;
}

describe('Changing a name', () => {
  it('saves the new name and closes the form', async () => {
    const state = keepSchool([milica]);
    const { user } = renderApp({ path: '/admin/users' });

    await user.click(await screen.findByRole('button', { name: 'Izmijeni ime: Milica Petrović' }));
    const field = screen.getByLabelText('Ime i prezime');
    expect(field).toHaveValue('Milica Petrović');
    await user.clear(field);
    await user.type(field, ' Milica Petrović Ilić ');
    await user.click(screen.getByRole('button', { name: 'Sačuvaj' }));

    expect(await screen.findByText('Milica Petrović Ilić')).toBeInTheDocument();
    expect(screen.queryByLabelText('Ime i prezime')).not.toBeInTheDocument();
    expect(state.sent).toEqual([{ path: 'PATCH u1', body: { fullName: 'Milica Petrović Ilić' } }]);
    // The username stays as it was.
    expect(screen.getByText('Korisničko ime: milica_petrovic')).toBeInTheDocument();
  });

  it('asks for a longer name without sending anything', async () => {
    const state = keepSchool([milica]);
    const { user } = renderApp({ path: '/admin/users' });

    await user.click(await screen.findByRole('button', { name: /Izmijeni ime/ }));
    await user.clear(screen.getByLabelText('Ime i prezime'));
    await user.type(screen.getByLabelText('Ime i prezime'), 'M');
    await user.click(screen.getByRole('button', { name: 'Sačuvaj' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('najmanje dva slova');
    expect(state.sent).toEqual([]);
  });

  it('keeps the form open and tells what the server did not accept', async () => {
    keepSchool([milica], { fail: 'invalid_full_name' });
    const { user } = renderApp({ path: '/admin/users' });

    await user.click(await screen.findByRole('button', { name: /Izmijeni ime/ }));
    await user.type(screen.getByLabelText('Ime i prezime'), '-');
    await user.click(screen.getByRole('button', { name: 'Sačuvaj' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ime nije ispravno');
    expect(screen.getByLabelText('Ime i prezime')).toBeInTheDocument();
  });

  it('can be abandoned', async () => {
    const state = keepSchool([milica]);
    const { user } = renderApp({ path: '/admin/users' });

    await user.click(await screen.findByRole('button', { name: /Izmijeni ime/ }));
    await user.click(screen.getByRole('button', { name: 'Odustani' }));

    expect(screen.queryByLabelText('Ime i prezime')).not.toBeInTheDocument();
    expect(state.sent).toEqual([]);
  });
});

describe('Marking users', () => {
  it('shows what is marked, and marks everybody on the page but the admin themselves', async () => {
    keepSchool([me, milica, ana]);
    const { user } = renderApp({ path: '/admin/users' });

    await user.click(await screen.findByRole('checkbox', { name: 'Označi: Milica Petrović' }));

    const bar = screen.getByRole('group', { name: 'Označeno: 1' });
    expect(within(bar).getByText('Označeno: 1')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Označi sve na stranici' }));

    expect(screen.getByRole('group', { name: 'Označeno: 2' })).toBeInTheDocument();
    // Nobody deactivates or deletes themselves, so there is nothing to mark.
    expect(
      screen.queryByRole('checkbox', { name: 'Označi: Marija Demić' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Poništi izbor' }));

    expect(screen.queryByRole('group', { name: /Označeno/ })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Označi: Ana Marković' })).not.toBeChecked();
  });

  it('forgets the marks when the filter changes, so nobody is changed unseen', async () => {
    keepSchool([milica, ana]);
    const { user } = renderApp({ path: '/admin/users' });
    await user.click(await screen.findByRole('checkbox', { name: 'Označi: Milica Petrović' }));

    await user.selectOptions(screen.getByLabelText('Uloga'), 'student');

    await waitFor(() =>
      expect(screen.queryByRole('group', { name: /Označeno/ })).not.toBeInTheDocument(),
    );
  });
});

describe('Deactivating', () => {
  it('asks first, then deactivates the marked users in one request', async () => {
    const state = keepSchool([milica, ana]);
    const { user } = renderApp({ path: '/admin/users' });
    await screen.findByText('Ana Marković');
    await user.click(screen.getByRole('checkbox', { name: 'Označi sve na stranici' }));

    await user.click(screen.getByRole('button', { name: 'Deaktiviraj (2)' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Svi podaci ostaju');
    expect(state.sent).toEqual([]);
    await user.click(within(dialog).getByRole('button', { name: 'Da, deaktiviraj' }));

    expect(await screen.findByText('Deaktivirano: 2.')).toBeInTheDocument();
    expect(state.sent).toEqual([{ path: 'deactivate', body: { ids: ['u1', 'u2'] } }]);
    // They are no longer among the active, and nothing stays marked.
    await waitFor(() => expect(screen.queryByText('Ana Marković')).not.toBeInTheDocument());
    expect(screen.queryByRole('group', { name: /Označeno/ })).not.toBeInTheDocument();
  });

  it('does nothing when the question is answered with Odustani', async () => {
    const state = keepSchool([milica]);
    const { user } = renderApp({ path: '/admin/users' });
    await user.click(await screen.findByRole('checkbox', { name: 'Označi: Milica Petrović' }));
    await user.click(screen.getByRole('button', { name: 'Deaktiviraj (1)' }));

    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Odustani' }),
    );

    expect(state.sent).toEqual([]);
    expect(screen.getByRole('checkbox', { name: 'Označi: Milica Petrović' })).toBeChecked();
  });

  it('says how many were skipped', async () => {
    keepSchool([milica, ana], { skip: ['u2'] });
    const { user } = renderApp({ path: '/admin/users' });
    await screen.findByText('Ana Marković');
    await user.click(screen.getByRole('checkbox', { name: 'Označi sve na stranici' }));
    await user.click(screen.getByRole('button', { name: 'Deaktiviraj (2)' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Da, deaktiviraj',
      }),
    );

    expect(await screen.findByText('Deaktivirano: 1. Preskočeno: 1.')).toBeInTheDocument();
  });

  it('keeps the marks and says why when it fails', async () => {
    keepSchool([milica], { fail: 'cannot_change_self' });
    const { user } = renderApp({ path: '/admin/users' });
    await user.click(await screen.findByRole('checkbox', { name: 'Označi: Milica Petrović' }));
    await user.click(screen.getByRole('button', { name: 'Deaktiviraj (1)' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Da, deaktiviraj',
      }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Svoj nalog ne možeš');
    expect(screen.getByRole('checkbox', { name: 'Označi: Milica Petrović' })).toBeChecked();
  });
});

describe('Bringing back and erasing', () => {
  async function openDeactivated(users: ManagedUser[]) {
    const state = keepSchool(users);
    const view = renderApp({ path: '/admin/users' });
    await view.user.selectOptions(await screen.findByLabelText('Stanje'), 'deactivated');
    return { state, ...view };
  }

  it('brings a deactivated user back without asking', async () => {
    const { state, user } = await openDeactivated([milica, petar]);

    await user.click(await screen.findByRole('checkbox', { name: 'Označi: Petar Marković' }));
    await user.click(screen.getByRole('button', { name: 'Vrati (1)' }));

    expect(await screen.findByText('Vraćeno: 1.')).toBeInTheDocument();
    expect(state.sent).toEqual([{ path: 'reactivate', body: { ids: ['u3'] } }]);
    await waitFor(() => expect(screen.queryByText('Petar Marković')).not.toBeInTheDocument());
  });

  it('erases for good only after a warning that it cannot be undone', async () => {
    const { state, user } = await openDeactivated([milica, petar]);
    await user.click(await screen.findByRole('checkbox', { name: 'Označi: Petar Marković' }));

    await user.click(screen.getByRole('button', { name: 'Obriši zauvijek (1)' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Ovo se ne može poništiti');
    expect(state.sent).toEqual([]);
    await user.click(within(dialog).getByRole('button', { name: 'Da, obriši zauvijek' }));

    expect(await screen.findByText('Obrisano zauvijek: 1.')).toBeInTheDocument();
    expect(state.sent).toEqual([{ path: 'delete', body: { ids: ['u3'] } }]);
  });

  it('does not offer to erase anyone who is still active', async () => {
    keepSchool([milica, petar]);
    const { user } = renderApp({ path: '/admin/users' });
    await user.selectOptions(await screen.findByLabelText('Stanje'), 'all');

    await user.click(await screen.findByRole('checkbox', { name: 'Označi: Milica Petrović' }));
    // An active person alone: nothing to erase.
    expect(screen.queryByRole('button', { name: /Obriši zauvijek/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Označi: Petar Marković' }));

    expect(screen.getByRole('button', { name: 'Obriši zauvijek (1)' })).toBeDisabled();
    expect(screen.getByText(/označi samo deaktivirane/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deaktiviraj (1)' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Vrati (1)' })).toBeEnabled();
  });
});

describe('Many users at once', () => {
  it('sends at most 200 ids in a request and adds the answers together', async () => {
    const sent: number[] = [];
    server.use(
      http.post('*/api/users/deactivate', async ({ request }) => {
        const { ids } = (await request.json()) as { ids: string[] };
        sent.push(ids.length);
        return HttpResponse.json({ affectedIds: ids.slice(1), skippedIds: ids.slice(0, 1) });
      }),
    );
    const ids = Array.from({ length: 450 }, (_, index) => `id-${index}`);

    const result = await usersApi.change('deactivate', ids);

    expect(sent).toEqual([200, 200, 50]);
    expect(result.affectedIds).toHaveLength(447);
    expect(result.skippedIds).toHaveLength(3);
  });
});

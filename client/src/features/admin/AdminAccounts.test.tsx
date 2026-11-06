import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { apiError } from '@/test/authFixtures';
import { managedUser } from '@/test/adminApiFixtures';
import { renderApp } from '@/test/renderApp';
import { server } from '@/test/server';
import type { ManagedUser } from './api/usersApi';

const LINK = 'http://localhost:5173/activate?token=abc123';
const EXPIRES = '2026-11-13T10:00:00.000Z';

const created = managedUser({
  id: 'new-1',
  username: 'jovan_ivic',
  fullName: 'Jovan Ivić',
  email: null,
  role: 'student',
  activated: false,
});

/** A server that makes the account and the link, and remembers what it was asked. */
function keepAccounts(options: { linkError?: string } = {}) {
  const state = {
    created: [] as unknown[],
    activations: [] as string[],
    linkFails: options.linkError,
  };
  server.use(
    http.post('*/api/users', async ({ request }) => {
      state.created.push(await request.json());
      return HttpResponse.json({ user: created }, { status: 201 });
    }),
    http.post('*/api/users/:id/activation', ({ params }) => {
      state.activations.push(String(params.id));
      if (state.linkFails) {
        const code = state.linkFails;
        state.linkFails = undefined;
        return HttpResponse.json(apiError(code), { status: code === 'not_found' ? 404 : 409 });
      }
      return HttpResponse.json({ activation: { url: LINK, expiresAt: EXPIRES } }, { status: 201 });
    }),
  );
  return state;
}

describe('Novi nalog', () => {
  it('is reached from the menu', async () => {
    server.use(http.get('*/api/users', () => HttpResponse.json({ users: [], total: 0 })));
    renderApp({ path: '/admin/users' });

    expect(await screen.findByRole('link', { name: 'Novi nalog' })).toHaveAttribute(
      'href',
      '/admin/users/new',
    );
  });

  it('makes the account and the link in one step, and shows the link as a QR code', async () => {
    const state = keepAccounts();
    const { user } = renderApp({ path: '/admin/users/new' });

    await user.type(await screen.findByLabelText('Ime i prezime'), '  Jovan Ivić ');
    await user.selectOptions(screen.getByLabelText('Uloga'), 'student');
    await user.click(screen.getByRole('button', { name: 'Napravi nalog' }));

    expect(
      await screen.findByRole('heading', { name: 'Nalog je napravljen: Jovan Ivić' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Korisničko ime: jovan_ivic')).toBeInTheDocument();
    expect(state.created).toEqual([{ fullName: 'Jovan Ivić', role: 'student' }]);
    expect(state.activations).toEqual(['new-1']);
    expect(screen.getByText(LINK)).toBeInTheDocument();
    expect(screen.getByText('Važi do 13. novembar 2026.')).toBeInTheDocument();
    const picture = await screen.findByRole('img', {
      name: 'QR kod aktivacionog linka za Jovan Ivić',
    });
    expect(picture.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
    // Saved as a picture the administrator can print or send.
    expect(screen.getByRole('link', { name: 'Preuzmi sliku' })).toHaveAttribute(
      'download',
      'aktivacija-jovan_ivic.png',
    );
  });

  it('opens with the role chosen when a page of the families asks for it', async () => {
    renderApp({ path: '/admin/users/new?role=parent' });

    expect(await screen.findByLabelText('Uloga')).toHaveValue('parent');
  });

  it('ignores a role in the address that cannot be created here', async () => {
    renderApp({ path: '/admin/users/new?role=admin' });

    expect(await screen.findByLabelText('Uloga')).toHaveValue('');
  });

  it('leads from a new child to the page where the parents are linked', async () => {
    keepAccounts();
    const { user } = renderApp({ path: '/admin/users/new?role=student' });
    await user.type(await screen.findByLabelText('Ime i prezime'), 'Jovan Ivić');
    await user.click(screen.getByRole('button', { name: 'Napravi nalog' }));

    expect(await screen.findByRole('link', { name: 'Poveži roditelje' })).toHaveAttribute(
      'href',
      '/admin/families/new-1',
    );
  });

  it('copies the link', async () => {
    keepAccounts();
    const { user } = renderApp({ path: '/admin/users/new' });
    await user.type(await screen.findByLabelText('Ime i prezime'), 'Jovan Ivić');
    await user.selectOptions(screen.getByLabelText('Uloga'), 'student');
    await user.click(screen.getByRole('button', { name: 'Napravi nalog' }));

    await user.click(await screen.findByRole('button', { name: 'Kopiraj link' }));

    expect(await screen.findByText('Link je kopiran.')).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toBe(LINK);
  });

  it('asks for a name of two letters and for a role, and sends nothing until both are given', async () => {
    const state = keepAccounts();
    const { user } = renderApp({ path: '/admin/users/new' });

    await user.type(await screen.findByLabelText('Ime i prezime'), 'J');
    await user.click(screen.getByRole('button', { name: 'Napravi nalog' }));

    expect(
      await screen.findByText('Upiši ime i prezime (najmanje dva slova).'),
    ).toBeInTheDocument();
    expect(screen.getByText('Izaberi ulogu.')).toBeInTheDocument();
    expect(state.created).toEqual([]);
  });

  it('keeps the form and says what the server did not accept', async () => {
    server.use(
      http.post('*/api/users', () =>
        HttpResponse.json(apiError('invalid_full_name'), { status: 400 }),
      ),
    );
    const { user } = renderApp({ path: '/admin/users/new' });
    await user.type(await screen.findByLabelText('Ime i prezime'), '--');
    await user.selectOptions(screen.getByLabelText('Uloga'), 'parent');
    await user.click(screen.getByRole('button', { name: 'Napravi nalog' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ime nije ispravno');
    expect(screen.getByLabelText('Ime i prezime')).toHaveValue('--');
  });

  it('shows the account even when the link could not be made, and tries again on request', async () => {
    const state = keepAccounts({ linkError: 'internal_error' });
    const { user } = renderApp({ path: '/admin/users/new' });
    await user.type(await screen.findByLabelText('Ime i prezime'), 'Jovan Ivić');
    await user.selectOptions(screen.getByLabelText('Uloga'), 'student');
    await user.click(screen.getByRole('button', { name: 'Napravi nalog' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Nalog je napravljen, ali link nije',
    );
    expect(screen.getByText('Korisničko ime: jovan_ivic')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Napravi link' }));

    expect(await screen.findByText(LINK)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // The account was made once; only the link was asked for twice.
    expect(state.created).toHaveLength(1);
    expect(state.activations).toEqual(['new-1', 'new-1']);
  });

  it('starts over for another account', async () => {
    keepAccounts();
    const { user } = renderApp({ path: '/admin/users/new' });
    await user.type(await screen.findByLabelText('Ime i prezime'), 'Jovan Ivić');
    await user.selectOptions(screen.getByLabelText('Uloga'), 'student');
    await user.click(screen.getByRole('button', { name: 'Napravi nalog' }));

    await user.click(await screen.findByRole('button', { name: 'Dodaj još jedan nalog' }));

    expect(screen.getByLabelText('Ime i prezime')).toHaveValue('');
    expect(screen.getByLabelText('Uloga')).toHaveValue('');
    expect(screen.queryByText(LINK)).not.toBeInTheDocument();
  });
});

describe('Novi link', () => {
  const answerUsers = (users: ManagedUser[]) =>
    server.use(http.get('*/api/users', () => HttpResponse.json({ users, total: users.length })));

  it('shows a new link for the user of the row, and hides it again', async () => {
    answerUsers([managedUser({ id: 'u1' }), managedUser({ id: 'u2', fullName: 'Ana Marković' })]);
    const state = keepAccounts();
    const { user } = renderApp({ path: '/admin/users' });

    await user.click(await screen.findByRole('button', { name: 'Novi link za Ana Marković' }));

    // The menu has list items too; the users are the ones in the list region.
    const rows = within(screen.getByRole('region', { name: 'Lista korisnika' })).getAllByRole(
      'listitem',
    );
    expect(await within(rows[1]!).findByText(LINK)).toBeInTheDocument();
    expect(within(rows[0]!).queryByText(LINK)).not.toBeInTheDocument();
    expect(state.activations).toEqual(['u2']);
    expect(
      await within(rows[1]!).findByRole('img', {
        name: 'QR kod aktivacionog linka za Ana Marković',
      }),
    ).toBeInTheDocument();

    await user.click(within(rows[1]!).getByRole('button', { name: 'Sakrij link' }));

    expect(screen.queryByText(LINK)).not.toBeInTheDocument();
  });

  it('is not offered for a user who has been deactivated', async () => {
    answerUsers([managedUser({ deactivatedAt: '2026-06-20T10:00:00.000Z' })]);
    const { user } = renderApp({ path: '/admin/users' });

    await user.selectOptions(await screen.findByLabelText('Stanje'), 'deactivated');

    await screen.findByText('Deaktiviran');
    expect(screen.queryByRole('button', { name: /Novi link/ })).not.toBeInTheDocument();
  });

  it('says why a link was refused', async () => {
    answerUsers([managedUser()]);
    keepAccounts({ linkError: 'user_deactivated' });
    const { user } = renderApp({ path: '/admin/users' });

    await user.click(await screen.findByRole('button', { name: /Novi link/ }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Korisnik je deaktiviran'),
    );
  });
});

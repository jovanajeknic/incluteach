import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { apiError, testUsers } from '@/test/authFixtures';
import { renderApp } from '@/test/renderApp';
import { server } from '@/test/server';

const VALID_PASSWORD = 'moja sigurna lozinka';

type Rendered = ReturnType<typeof renderApp>;

/** Auth pages are lazy routes, so wait until the page heading is rendered. */
async function openPage(path: string) {
  const result = renderApp({ path });
  await screen.findByRole('heading', { level: 1 });
  return result;
}

describe('Auth navigation', () => {
  it('moves from the home page to sign-in; there is no self-registration', async () => {
    const { user, router } = renderApp({ path: '/' });

    expect(screen.queryByRole('link', { name: /Registruj/ })).not.toBeInTheDocument();
    await user.click(within(screen.getByRole('banner')).getByRole('link', { name: 'Prijavi se' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Prijava' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');

    await user.click(screen.getAllByRole('link', { name: 'IncluTeach – početna stranica' })[0]!);
    expect(router.state.location.pathname).toBe('/');
  });

  it('no longer has a registration page', () => {
    renderApp({ path: '/register' });
    expect(
      screen.getByRole('heading', { level: 1, name: 'Stranica nije pronađena' }),
    ).toBeInTheDocument();
  });

  it('has no student card sign-in any more; everyone uses the same form', async () => {
    await openPage('/login');
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/kartice/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Email ili korisničko ime/)).toBeInTheDocument();
  });
});

describe('Sign-in', () => {
  it('reports empty fields and focuses the first one', async () => {
    const { user } = await openPage('/login');

    await user.click(screen.getByRole('button', { name: 'Prijavi se' }));

    expect(await screen.findByText('Unesite email ili korisničko ime.')).toBeInTheDocument();
    expect(screen.getByText('Unesite lozinku.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email ili korisničko ime/)).toHaveFocus();
  });

  it('shows and hides the password without submitting the form', async () => {
    const { user } = await openPage('/login');
    const password = screen.getByLabelText('Lozinka');
    const toggle = screen.getByRole('button', { name: 'Prikaži lozinku' });

    await user.type(password, 'tajna lozinka');
    expect(password).toHaveAttribute('type', 'password');

    await user.click(toggle);
    expect(password).toHaveAttribute('type', 'text');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    // No submit happened: the empty identifier field shows no error.
    expect(screen.queryByText('Unesite email ili korisničko ime.')).not.toBeInTheDocument();
  });

  it.each([
    ['teacher', 'milica_petrovic', '/teacher'],
    ['student', 'ana_markovic', '/student'],
    ['parent', 'petar_markovic', '/parent'],
    ['admin', 'marija_demic', '/admin'],
  ] as const)('sends a %s to their own home page', async (role, username, home) => {
    let received: unknown;
    server.use(
      http.post('*/api/auth/login', async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ user: testUsers[role] });
      }),
    );
    const { user, router } = await openPage('/login');

    await user.type(screen.getByLabelText(/Email ili korisničko ime/), `  ${username} `);
    await user.type(screen.getByLabelText('Lozinka'), VALID_PASSWORD);
    await user.keyboard('{Enter}');

    await waitFor(() => expect(router.state.location.pathname).toBe(home));
    // The identifier is trimmed, the password is sent as typed.
    expect(received).toEqual({ identifier: username, password: VALID_PASSWORD });
  });

  it('shows a loading state while the server thinks', async () => {
    server.use(
      http.post('*/api/auth/login', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json({ user: testUsers.teacher });
      }),
    );
    const { user, router } = await openPage('/login');

    await user.type(screen.getByLabelText(/Email ili korisničko ime/), 'milica_petrovic');
    await user.type(screen.getByLabelText('Lozinka'), VALID_PASSWORD);
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('button', { name: /Prijavljivanje/ })).toBeDisabled();
    await waitFor(() => expect(router.state.location.pathname).toBe('/teacher'));
  });

  it('shows the same calm message for wrong credentials and clears the password', async () => {
    server.use(
      http.post('*/api/auth/login', () =>
        HttpResponse.json(apiError('invalid_credentials'), { status: 401 }),
      ),
    );
    const { user, router } = await openPage('/login');

    await user.type(screen.getByLabelText(/Email ili korisničko ime/), 'ana_markovic');
    await user.type(screen.getByLabelText('Lozinka'), 'pogresna lozinka');
    await user.click(screen.getByRole('button', { name: 'Prijavi se' }));

    expect(await screen.findByText(/nijesu tačni/)).toBeInTheDocument();
    expect(screen.getByLabelText('Lozinka')).toHaveValue('');
    expect(screen.getByLabelText(/Email ili korisničko ime/)).toHaveValue('ana_markovic');
    expect(router.state.location.pathname).toBe('/login');
  });

  it('asks to wait after too many attempts', async () => {
    server.use(
      http.post('*/api/auth/login', () =>
        HttpResponse.json(apiError('too_many_attempts'), { status: 429 }),
      ),
    );
    const { user } = await openPage('/login');

    await user.type(screen.getByLabelText(/Email ili korisničko ime/), 'ana_markovic');
    await user.type(screen.getByLabelText('Lozinka'), VALID_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Prijavi se' }));

    expect(await screen.findByText(/Previše pokušaja/)).toBeInTheDocument();
  });

  it('explains when the server cannot be reached', async () => {
    server.use(http.post('*/api/auth/login', () => HttpResponse.error()));
    const { user } = await openPage('/login');

    await user.type(screen.getByLabelText(/Email ili korisničko ime/), 'ana_markovic');
    await user.type(screen.getByLabelText('Lozinka'), VALID_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Prijavi se' }));

    expect(await screen.findByText(/Server trenutno nije dostupan/)).toBeInTheDocument();
  });

  it('sends someone who is already signed in to their home page', async () => {
    const { router } = renderApp({ path: '/login', user: testUsers.parent });
    await waitFor(() => expect(router.state.location.pathname).toBe('/parent'));
  });
});

describe('Restoring and ending the session', () => {
  it('restores the signed-in user after a reload by asking the server', async () => {
    server.use(http.get('*/api/auth/me', () => HttpResponse.json({ user: testUsers.admin })));

    renderApp({ path: '/admin', user: 'ask-server' });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Administracija škole' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Prijavljeni ste kao Marija Demić/)).toBeInTheDocument();
  });

  it('goes to sign-in when the server says nobody is signed in', async () => {
    server.use(
      http.get('*/api/auth/me', () =>
        HttpResponse.json(apiError('unauthenticated'), { status: 401 }),
      ),
    );

    const { router } = renderApp({ path: '/teacher', user: 'ask-server' });

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });

  it('does not treat an unreachable server as "signed out"', async () => {
    server.use(http.get('*/api/auth/me', () => HttpResponse.error()));

    const { router } = renderApp({ path: '/teacher', user: 'ask-server' });

    expect(
      await screen.findByRole('heading', { name: 'Server nije dostupan' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pokušaj ponovo' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/teacher');
  });

  it('signs out, forgets the session and returns to sign-in', async () => {
    let called = false;
    server.use(
      http.post('*/api/auth/logout', () => {
        called = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user, router, queryClient } = renderApp({ path: '/student' });

    await user.click(screen.getByRole('button', { name: 'Odjavi se' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(called).toBe(true);
    expect(queryClient.getQueryData(['session'])).toBeNull();
  });

  it('stays signed in and says so when signing out fails', async () => {
    server.use(http.post('*/api/auth/logout', () => HttpResponse.error()));
    const { user, router } = renderApp({ path: '/student' });

    await user.click(screen.getByRole('button', { name: 'Odjavi se' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Odjava nije uspjela');
    expect(router.state.location.pathname).toBe('/student');
  });

  it('drops the session when any call answers 401 unauthenticated', async () => {
    server.use(
      http.post('*/api/auth/logout', () =>
        HttpResponse.json(apiError('unauthenticated'), { status: 401 }),
      ),
    );
    const { user, router } = renderApp({ path: '/student' });

    await user.click(screen.getByRole('button', { name: 'Odjavi se' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });
});

describe('Role guard', () => {
  it.each([
    ['/teacher', 'student'],
    ['/student', 'parent'],
    ['/parent', 'teacher'],
    ['/admin', 'teacher'],
  ] as const)('shows the no-access page on %s to a %s', async (path, role) => {
    const { router } = renderApp({ path, user: testUsers[role] });

    expect(await screen.findByRole('heading', { name: 'Nemate pristup' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Na vašu početnu stranicu' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(path);
  });

  it.each(['/teacher', '/student', '/parent', '/admin'])(
    'sends a visitor from %s to sign-in',
    async (path) => {
      const { router } = renderApp({ path, user: null });
      await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    },
  );
});

describe('Activating an account from the link of the school', () => {
  async function fillForm(
    user: Rendered['user'],
    values: { password?: string; confirm?: string; email?: string } = {},
  ) {
    await user.type(screen.getByLabelText(/Nova lozinka/), values.password ?? VALID_PASSWORD);
    await user.type(
      screen.getByLabelText('Potvrdite lozinku'),
      values.confirm ?? values.password ?? VALID_PASSWORD,
    );
    await user.type(screen.getByLabelText(/Email adresa/), values.email ?? 'ana@primjer.me');
  }

  it('explains what to do when the address has no token', async () => {
    await openPage('/activate');
    expect(screen.getByText(/nema vezu za aktivaciju/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Nova lozinka/)).not.toBeInTheDocument();
  });

  it('requires every field and focuses the first', async () => {
    const { user } = await openPage('/activate?token=abc');

    await user.click(screen.getByRole('button', { name: 'Aktiviraj nalog' }));

    expect(await screen.findByText('Unesite lozinku.')).toBeInTheDocument();
    expect(screen.getByText('Ponovo unesite lozinku.')).toBeInTheDocument();
    expect(screen.getByText('Unesite email adresu.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nova lozinka/)).toHaveFocus();
  });

  it('rejects passwords that do not match', async () => {
    const { user } = await openPage('/activate?token=abc');
    await fillForm(user, { confirm: 'nesto drugo 123' });

    await user.click(screen.getByRole('button', { name: 'Aktiviraj nalog' }));

    expect(await screen.findByText('Lozinke se ne podudaraju.')).toBeInTheDocument();
    expect(screen.getByLabelText('Potvrdite lozinku')).toHaveFocus();
  });

  it('rejects a password shorter than 7 characters, explained in the hint', async () => {
    const { user } = await openPage('/activate?token=abc');
    await fillForm(user, { password: 'kratka' });

    await user.click(screen.getByRole('button', { name: 'Aktiviraj nalog' }));

    expect(await screen.findByText('Lozinka mora imati najmanje 7 znakova.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nova lozinka/)).toHaveAccessibleDescription(/Najmanje 7 znakova/);
  });

  it('accepts exactly 7 characters', async () => {
    server.use(
      http.post('*/api/auth/activate', () => HttpResponse.json({ user: testUsers.student })),
    );
    const { user, router } = await openPage('/activate?token=abc');
    await fillForm(user, { password: 'sedmica' });

    await user.click(screen.getByRole('button', { name: 'Aktiviraj nalog' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/student'));
  });

  it('rejects an invalid email address', async () => {
    const { user } = await openPage('/activate?token=abc');
    await fillForm(user, { email: 'ana.primjer.me' });

    await user.click(screen.getByRole('button', { name: 'Aktiviraj nalog' }));

    expect(await screen.findByText(/Unesite ispravnu email adresu/)).toBeInTheDocument();
  });

  it('sends the token from the link, signs the person in and opens their home page', async () => {
    let received: unknown;
    server.use(
      http.post('*/api/auth/activate', async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ user: testUsers.parent });
      }),
    );
    const { user, router } = await openPage('/activate?token=tajni-token');
    await fillForm(user);

    await user.click(screen.getByRole('button', { name: 'Aktiviraj nalog' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/parent'));
    expect(received).toEqual({
      token: 'tajni-token',
      password: VALID_PASSWORD,
      email: 'ana@primjer.me',
    });
  });

  it('explains a used or expired link and clears the passwords', async () => {
    server.use(
      http.post('*/api/auth/activate', () =>
        HttpResponse.json(apiError('invalid_activation_link'), { status: 400 }),
      ),
    );
    const { user, router } = await openPage('/activate?token=stari');
    await fillForm(user);

    await user.click(screen.getByRole('button', { name: 'Aktiviraj nalog' }));

    expect(await screen.findByText(/već iskorišćena ili je istekla/)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/activate');
    expect(screen.getByLabelText(/Nova lozinka/)).toHaveValue('');
  });

  it('shows "email taken" next to the email field', async () => {
    server.use(
      http.post('*/api/auth/activate', () =>
        HttpResponse.json(apiError('email_taken'), { status: 409 }),
      ),
    );
    const { user } = await openPage('/activate?token=abc');
    await fillForm(user);

    await user.click(screen.getByRole('button', { name: 'Aktiviraj nalog' }));

    expect(
      await screen.findByText('Ova email adresa se već koristi. Unesite drugu.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Email adresa/)).toHaveFocus();
    expect(screen.getByLabelText(/Email adresa/)).toHaveValue('ana@primjer.me');
  });

  it('links back to sign-in', async () => {
    const { user, router } = await openPage('/activate?token=abc');
    await user.click(screen.getByRole('link', { name: 'Prijavite se.' }));
    await screen.findByRole('heading', { level: 1, name: 'Prijava' });
    expect(router.state.location.pathname).toBe('/login');
  });
});

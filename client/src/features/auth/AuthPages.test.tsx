import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/renderApp';

const VALID_PASSWORD = 'moja sigurna lozinka';

/** Auth pages are lazy routes, so wait until the page heading is rendered. */
async function openPage(path: string) {
  const result = renderApp({ path });
  await screen.findByRole('heading', { level: 1 });
  return result;
}

// The demo must never touch the network or browser storage.
let fetchSpy: ReturnType<typeof vi.fn>;
let setItemSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);
  setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Auth navigation', () => {
  it('moves between home, sign-in and activation; there is no self-registration', async () => {
    const { user, router } = renderApp({ path: '/' });

    expect(screen.queryByRole('link', { name: /Registruj/ })).not.toBeInTheDocument();
    await user.click(within(screen.getByRole('banner')).getByRole('link', { name: 'Prijavi se' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Prijava' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');

    await user.click(screen.getByRole('link', { name: 'Aktivirajte nalog.' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Aktivirajte nalog' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/activate');

    await user.click(screen.getByRole('link', { name: 'Prijavite se.' }));
    await screen.findByRole('heading', { level: 1, name: 'Prijava' });

    await user.click(screen.getAllByRole('link', { name: 'IncluTeach – početna stranica' })[0]!);
    expect(router.state.location.pathname).toBe('/');
  });

  it('no longer has a registration page', () => {
    renderApp({ path: '/register' });
    expect(
      screen.getByRole('heading', { level: 1, name: 'Stranica nije pronađena' }),
    ).toBeInTheDocument();
  });

  it('labels the pages clearly as a demo', async () => {
    await openPage('/login');
    expect(screen.getByRole('note')).toHaveTextContent(
      'Demo prikaz — prijava i aktivacija naloga još nijesu povezani sa serverom.',
    );
  });
});

describe('Sign-in for teachers and parents', () => {
  it('reports empty fields and focuses the first one', async () => {
    const { user } = await openPage('/login');

    await user.click(screen.getByRole('button', { name: 'Prijavi se' }));

    expect(await screen.findByText('Unesite email adresu.')).toBeInTheDocument();
    expect(screen.getByText('Unesite lozinku.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email adresa')).toHaveFocus();
    expect(screen.getByLabelText('Email adresa')).toHaveAccessibleDescription(
      'Unesite email adresu.',
    );
  });

  it('rejects an invalid email address', async () => {
    const { user } = await openPage('/login');

    await user.type(screen.getByLabelText('Email adresa'), 'ana.primjer.me');
    await user.type(screen.getByLabelText('Lozinka'), 'bilo koja');
    await user.keyboard('{Enter}');

    expect(await screen.findByText(/Unesite ispravnu email adresu/)).toBeInTheDocument();
    expect(screen.getByLabelText('Email adresa')).toHaveFocus();
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
    // No submit happened: the empty email field shows no error.
    expect(screen.queryByText('Unesite email adresu.')).not.toBeInTheDocument();

    await user.click(toggle);
    expect(password).toHaveAttribute('type', 'password');
  });

  it('submits with Enter, shows a loading state and a demo result', async () => {
    const { user } = await openPage('/login');

    await user.type(screen.getByLabelText('Email adresa'), '  ana@primjer.me ');
    await user.type(screen.getByLabelText('Lozinka'), VALID_PASSWORD);
    await user.keyboard('{Enter}');

    expect(screen.getByRole('button', { name: /Prijavljivanje/ })).toBeDisabled();
    expect(await screen.findByText(/prijava nije stvarno izvršena/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Forma je uspješno provjerena.');
    expect(screen.getByRole('button', { name: 'Prijavi se' })).toBeEnabled();
    // The password is cleared after the demo check.
    expect(screen.getByLabelText('Lozinka')).toHaveValue('');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
  });
});

describe('Sign-in for students with a card', () => {
  it('asks for the card code instead of an email and password', async () => {
    const { user } = await openPage('/login');

    await user.click(screen.getByRole('tab', { name: 'Učenik' }));
    expect(screen.queryByLabelText('Email adresa')).not.toBeInTheDocument();
    expect(screen.getByText(/Pokaži svoju karticu kameri/)).toBeInTheDocument();
    expect(screen.getByText(/Izgubio si karticu\?/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Prijavi se' }));
    expect(await screen.findByText('Upiši kod sa kartice.')).toBeInTheDocument();
    expect(screen.getByLabelText('Kod sa kartice')).toHaveFocus();
  });

  it('rejects a code that is too short', async () => {
    const { user } = await openPage('/login');
    await user.click(screen.getByRole('tab', { name: 'Učenik' }));

    await user.type(screen.getByLabelText('Kod sa kartice'), 'ABC-12');
    await user.click(screen.getByRole('button', { name: 'Prijavi se' }));

    expect(await screen.findByText(/Kod ima 8 slova i brojeva/)).toBeInTheDocument();
  });

  it('accepts a code in lower case and with a dash, without network or storage', async () => {
    const { user } = await openPage('/login');
    await user.click(screen.getByRole('tab', { name: 'Učenik' }));

    await user.type(screen.getByLabelText('Kod sa kartice'), 'abcd-1234');
    await user.click(screen.getByRole('button', { name: 'Prijavi se' }));

    expect(await screen.findByText(/Kod je ispravno upisan/)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
  });
});

describe('Activating an account from an invitation', () => {
  async function fillPasswords(user: ReturnType<typeof renderApp>['user']) {
    await user.type(screen.getByLabelText('Nova lozinka'), VALID_PASSWORD);
    await user.type(screen.getByLabelText('Potvrdite lozinku'), VALID_PASSWORD);
  }

  it('takes the code from the invitation link', async () => {
    await openPage('/activate?code=K7Q2-M9XA');
    expect(screen.getByLabelText('Kod iz pozivnice')).toHaveValue('K7Q2-M9XA');
  });

  it('requires every field and focuses the code first', async () => {
    const { user } = await openPage('/activate');

    await user.click(screen.getByRole('button', { name: 'Aktiviraj nalog' }));

    expect(await screen.findByText('Unesite kod iz pozivnice.')).toBeInTheDocument();
    expect(screen.getByText('Unesite lozinku.')).toBeInTheDocument();
    expect(screen.getByText('Ponovo unesite lozinku.')).toBeInTheDocument();
    expect(screen.getByLabelText('Kod iz pozivnice')).toHaveFocus();
  });

  it('rejects passwords that do not match', async () => {
    const { user } = await openPage('/activate?code=K7Q2M9XA');
    await fillPasswords(user);
    await user.type(screen.getByLabelText('Potvrdite lozinku'), '!');

    await user.click(screen.getByRole('button', { name: 'Aktiviraj nalog' }));

    expect(await screen.findByText('Lozinke se ne podudaraju.')).toBeInTheDocument();
    expect(screen.getByLabelText('Potvrdite lozinku')).toHaveFocus();
  });

  it('rejects a password shorter than 12 characters, explained in the hint', async () => {
    const { user } = await openPage('/activate?code=K7Q2M9XA');
    await user.type(screen.getByLabelText('Nova lozinka'), 'kratka');
    await user.type(screen.getByLabelText('Potvrdite lozinku'), 'kratka');

    await user.click(screen.getByRole('button', { name: 'Aktiviraj nalog' }));

    expect(await screen.findByText('Lozinka mora imati najmanje 12 znakova.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nova lozinka')).toHaveAccessibleDescription(
      /Najmanje 12 znakova\. Razmaci su dozvoljeni/,
    );
  });

  it('shows a demo result after a valid submission, without network or storage', async () => {
    const { user } = await openPage('/activate?code=K7Q2-M9XA');
    await fillPasswords(user);

    await user.click(screen.getByRole('button', { name: 'Aktiviraj nalog' }));

    expect(screen.getByRole('button', { name: /Aktiviranje/ })).toBeDisabled();
    expect(await screen.findByText(/nalog nije stvarno aktiviran/)).toBeInTheDocument();
    expect(screen.getByLabelText('Nova lozinka')).toHaveValue('');
    expect(screen.getByLabelText('Potvrdite lozinku')).toHaveValue('');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
  });
});

describe('Choosing who signs in', () => {
  it('offers teacher, parent and student separately', async () => {
    await openPage('/login');
    const roles = within(screen.getByRole('tablist', { name: 'Prijavljujem se kao' }));
    expect(roles.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Nastavnik',
      'Roditelj',
      'Učenik',
    ]);
    expect(roles.getByRole('tab', { name: 'Nastavnik' })).toHaveAttribute('aria-selected', 'true');
  });

  it("opens the chosen role's demo after a valid sign-in", async () => {
    const { user } = await openPage('/login');

    await user.click(screen.getByRole('tab', { name: 'Roditelj' }));
    expect(screen.getByText(/emailom na koji je stigla pozivnica škole/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Email adresa'), 'jelena@primjer.me');
    await user.type(screen.getByLabelText('Lozinka'), VALID_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Prijavi se' }));

    expect(await screen.findByRole('link', { name: /Otvori roditeljski demo/ })).toHaveAttribute(
      'href',
      '/parent',
    );
  });
});

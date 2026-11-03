import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/renderApp';

const VALID_PASSWORD = 'moja sigurna lozinka';

/** Auth pages are lazy routes, so wait until the page heading is rendered. */
async function openPage(path: '/login' | '/register') {
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
  it('moves between home, sign-in and registration', async () => {
    const { user, router } = renderApp({ path: '/' });

    // Auth pages are lazy routes: wait for each page before checking the address.
    await user.click(within(screen.getByRole('banner')).getByRole('link', { name: 'Prijavi se' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Dobro došli nazad' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');

    await user.click(screen.getByRole('link', { name: 'Registrujte se.' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Dobro došli u IncluTeach' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/register');

    await user.click(screen.getByRole('link', { name: 'Prijavite se.' }));
    await screen.findByRole('heading', { level: 1, name: 'Dobro došli nazad' });
    expect(router.state.location.pathname).toBe('/login');

    await user.click(screen.getAllByRole('link', { name: 'IncluTeach – početna stranica' })[0]!);
    expect(router.state.location.pathname).toBe('/');
  });

  it('labels both pages clearly as a demo', async () => {
    await openPage('/login');
    expect(screen.getByRole('note')).toHaveTextContent(
      'Demo prikaz — prijava i kreiranje naloga još nijesu povezani sa serverom.',
    );
  });
});

describe('Sign-in page', () => {
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

describe('Registration page', () => {
  async function fillValidForm(user: ReturnType<typeof renderApp>['user']) {
    await user.click(screen.getByRole('radio', { name: 'Roditelj' }));
    await user.type(screen.getByLabelText('Ime'), 'Ana');
    await user.type(screen.getByLabelText('Prezime'), 'Marković');
    await user.type(screen.getByLabelText('Email adresa'), 'ana@primjer.me');
    await user.type(screen.getByLabelText('Lozinka'), VALID_PASSWORD);
    await user.type(screen.getByLabelText('Potvrdite lozinku'), VALID_PASSWORD);
  }

  it('offers only teacher and parent roles', async () => {
    await openPage('/register');

    const group = screen.getByRole('group', { name: 'Uloga' });
    const radios = within(group).getAllByRole('radio');
    expect(radios.map((radio) => radio.getAttribute('value'))).toEqual(['teacher', 'parent']);
    expect(within(group).getByText(/Učenike u aplikaciju dodaje škola/)).toBeInTheDocument();
  });

  it('requires every field and focuses the role first', async () => {
    const { user } = await openPage('/register');

    await user.click(screen.getByRole('button', { name: 'Napravi nalog' }));

    expect(await screen.findByText('Izaberite ulogu.')).toBeInTheDocument();
    for (const message of [
      'Unesite ime.',
      'Unesite prezime.',
      'Unesite email adresu.',
      'Unesite lozinku.',
      'Ponovo unesite lozinku.',
    ]) {
      expect(screen.getByText(message)).toBeInTheDocument();
    }
    expect(screen.getByRole('radio', { name: 'Nastavnik' })).toHaveFocus();
  });

  it('selects a role', async () => {
    const { user } = await openPage('/register');

    await user.click(screen.getByRole('radio', { name: 'Nastavnik' }));
    expect(screen.getByRole('radio', { name: 'Nastavnik' })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: 'Roditelj' }));
    expect(screen.getByRole('radio', { name: 'Roditelj' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Nastavnik' })).not.toBeChecked();
  });

  it('rejects passwords that do not match', async () => {
    const { user } = await openPage('/register');
    await fillValidForm(user);
    await user.clear(screen.getByLabelText('Potvrdite lozinku'));
    await user.type(screen.getByLabelText('Potvrdite lozinku'), `${VALID_PASSWORD}!`);

    await user.click(screen.getByRole('button', { name: 'Napravi nalog' }));

    expect(await screen.findByText('Lozinke se ne podudaraju.')).toBeInTheDocument();
    expect(screen.getByLabelText('Potvrdite lozinku')).toHaveFocus();
  });

  it('rejects a password shorter than 12 characters, explained in the hint', async () => {
    const { user } = await openPage('/register');
    await fillValidForm(user);
    await user.clear(screen.getByLabelText('Lozinka'));
    await user.type(screen.getByLabelText('Lozinka'), 'kratka');

    await user.click(screen.getByRole('button', { name: 'Napravi nalog' }));

    expect(await screen.findByText('Lozinka mora imati najmanje 12 znakova.')).toBeInTheDocument();
    expect(screen.getByLabelText('Lozinka')).toHaveAccessibleDescription(
      /Najmanje 12 znakova\. Razmaci su dozvoljeni/,
    );
  });

  it('shows a demo result after a valid submission, without network or storage', async () => {
    const { user } = await openPage('/register');
    await fillValidForm(user);

    await user.click(screen.getByRole('button', { name: 'Napravi nalog' }));

    expect(screen.getByRole('button', { name: /Pravljenje naloga/ })).toBeDisabled();
    expect(await screen.findByText(/nalog nije stvarno napravljen/)).toBeInTheDocument();
    expect(screen.getByLabelText('Lozinka')).toHaveValue('');
    expect(screen.getByLabelText('Potvrdite lozinku')).toHaveValue('');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
  });
});

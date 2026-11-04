import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/renderApp';

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

async function openPage() {
  const result = renderApp({ path: '/school-request' });
  await screen.findByRole('heading', { level: 1, name: 'Prijavite školu' });
  return result;
}

describe('School request', () => {
  it('is reached from the landing page', async () => {
    const { user, router } = renderApp({ path: '/' });
    const section = screen.getByRole('region', { name: 'Vaša škola u IncluTeach-u' });

    await user.click(within(section).getByRole('link', { name: /Prijavite školu/ }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Prijavite školu' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/school-request');
  });

  it('explains that it is a request, not an account, and what follows', async () => {
    await openPage();
    expect(screen.getByText(/Ovo je zahtjev, ne nalog/)).toBeInTheDocument();
    const steps = within(screen.getByRole('region', { name: 'Šta slijedi' })).getAllByRole(
      'listitem',
    );
    expect(steps).toHaveLength(3);
    expect(steps[2]).toHaveTextContent('Administrator škole dobija pozivnicu');
  });

  it('requires the school, the contact person, an email and consent', async () => {
    const { user } = await openPage();

    await user.click(screen.getByRole('button', { name: 'Pošalji zahtjev' }));

    for (const message of [
      'Unesite naziv škole.',
      'Unesite opštinu.',
      'Unesite ime i prezime.',
      'Izaberite funkciju.',
      'Unesite email adresu.',
      'Potrebna je saglasnost da bismo vas kontaktirali.',
    ]) {
      expect(await screen.findByText(message)).toBeInTheDocument();
    }
    expect(screen.getByLabelText('Naziv škole')).toHaveFocus();
  });

  it('accepts a complete request in demo mode without sending or storing anything', async () => {
    const { user } = await openPage();

    await user.type(screen.getByLabelText('Naziv škole'), 'OŠ „Sunce“');
    await user.type(screen.getByLabelText('Opština'), 'Podgorica');
    await user.type(screen.getByLabelText('Ime i prezime'), 'Marija Ivanović');
    await user.selectOptions(screen.getByLabelText('Funkcija u školi'), 'Direktor/ka');
    await user.type(screen.getByLabelText('Službeni email škole'), 'info@sunce.edu.me');
    await user.click(screen.getByRole('checkbox', { name: /Slažem se/ }));
    await user.click(screen.getByRole('button', { name: 'Pošalji zahtjev' }));

    expect(screen.getByRole('button', { name: /Slanje/ })).toBeDisabled();
    expect(await screen.findByText(/ništa nije poslato/)).toBeInTheDocument();
    expect(screen.getByLabelText('Naziv škole')).toHaveValue('');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
  });
});

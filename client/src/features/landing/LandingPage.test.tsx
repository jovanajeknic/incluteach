import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/renderApp';

describe('LandingPage', () => {
  it('states what the app is for in a heading and one sentence', () => {
    renderApp({ path: '/' });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Različiti načini učenja. Jednake prilike.' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/pomaže nastavnicima da svaku lekciju prilagode/)).toBeInTheDocument();
  });

  it.each([
    ['Prijavi se', '/login', 'Prijava je u pripremi'],
    ['Registruj se', '/register', 'Registracija je u pripremi'],
  ])('header "%s" opens %s, which says it is coming soon', async (name, path, heading) => {
    const { user, router } = renderApp({ path: '/' });

    const header = screen.getByRole('banner');
    await user.click(within(header).getByRole('link', { name }));

    expect(router.state.location.pathname).toBe(path);
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });

  it('offers the teacher demo from the coming-soon page', async () => {
    const { user, router } = renderApp({ path: '/login' });

    await user.click(screen.getByRole('link', { name: /Isprobaj nastavnički demo/ }));

    expect(router.state.location.pathname).toBe('/teacher');
  });

  it('opens the teacher demo from the hero', async () => {
    const { user, router } = renderApp({ path: '/' });

    await user.click(screen.getByRole('link', { name: 'Isprobaj demo' }));

    expect(router.state.location.pathname).toBe('/teacher');
    expect(screen.getByRole('heading', { level: 1, name: /Dobro došli/ })).toBeInTheDocument();
  });

  it('shows the three roles and marks the unfinished ones as coming soon', () => {
    renderApp({ path: '/' });

    const roles = screen.getByRole('region', { name: 'Za koga je IncluTeach' });
    const items = within(roles).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Nastavnik');
    expect(items[0]).toHaveTextContent('Dostupno u demou');
    expect(items[1]).toHaveTextContent('Učenik');
    expect(items[1]).toHaveTextContent('U pripremi');
    expect(items[2]).toHaveTextContent('Roditelj');
    expect(items[2]).toHaveTextContent('U pripremi');
  });

  it('labels the hero visual as illustrative', () => {
    renderApp({ path: '/' });
    expect(screen.getByRole('figure')).toHaveAccessibleName(/Ilustrativni prikaz/);
  });

  it('only contains links with a real destination', () => {
    renderApp({ path: '/' });

    for (const link of screen.getAllByRole('link')) {
      const href = link.getAttribute('href') ?? '';
      if (href.startsWith('#')) {
        expect(document.getElementById(href.slice(1)), href).toBeInTheDocument();
      } else {
        expect(['/', '/teacher', '/login', '/register']).toContain(href);
      }
    }
  });
});

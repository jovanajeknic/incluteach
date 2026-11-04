import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/renderApp';

const sectionNavigation = [
  { name: 'O nama', id: 'o-nama' },
  { name: 'Za koga je', id: 'za-koga-je' },
];

const getMenuButton = () => screen.getByRole('button', { name: 'Meni' });
const getMenu = () => document.getElementById('site-mobile-menu');

describe('LandingPage', () => {
  it('shows the headline, eyebrow and short description', () => {
    renderApp({ path: '/' });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Učimo različito. Rastemo zajedno.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Učenje koje nas povezuje')).toBeInTheDocument();
    expect(
      screen.getByText('Prostor za znanje, podršku i prilike za svako dijete.'),
    ).toBeInTheDocument();
  });

  it('keeps the background photo decorative and hidden from screen readers', () => {
    renderApp({ path: '/' });
    const photos = document.querySelectorAll('img[src="/images/hero-classroom.jpg"]');
    expect(photos.length).toBeGreaterThan(0);
    for (const photo of photos) {
      expect(photo).toHaveAttribute('alt', '');
      expect(photo.closest('[aria-hidden="true"]')).not.toBeNull();
    }
  });

  it('links header navigation to sections that exist on the page', () => {
    renderApp({ path: '/' });

    const nav = within(screen.getByRole('banner')).getByRole('navigation', {
      name: 'Glavna navigacija',
    });
    for (const { name, id } of sectionNavigation) {
      expect(within(nav).getByRole('link', { name })).toHaveAttribute('href', `#${id}`);
      expect(document.getElementById(id)).toBeInTheDocument();
    }
  });

  it.each([['Prijavi se', '/login', 'Prijava']])(
    'header "%s" opens the %s page',
    async (name, path, heading) => {
      const { user, router } = renderApp({ path: '/' });

      await user.click(within(screen.getByRole('banner')).getByRole('link', { name }));

      // Auth pages are lazy routes: navigation finishes once the page has loaded.
      expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
      expect(router.state.location.pathname).toBe(path);
    },
  );

  it('opens the teacher demo from "Istraži IncluTeach"', async () => {
    const { user, router } = renderApp({ path: '/' });

    await user.click(screen.getByRole('link', { name: 'Istraži IncluTeach' }));

    expect(router.state.location.pathname).toBe('/teacher');
  });

  it('points "Naša priča" to the about section', () => {
    renderApp({ path: '/' });
    expect(screen.getByRole('link', { name: 'Naša priča' })).toHaveAttribute('href', '#o-nama');
    expect(screen.getByRole('heading', { level: 2, name: 'Naša priča' })).toBeInTheDocument();
  });

  it('shows the three audiences, each with a demo link', () => {
    renderApp({ path: '/' });

    const section = screen.getByRole('region', { name: 'Zajedno stvaramo prostor za svakoga.' });
    const items = within(section).getAllByRole('listitem');
    expect(items.map((item) => within(item).getByRole('heading').textContent)).toEqual([
      'Za nastavnike',
      'Za učenike',
      'Za roditelje',
    ]);
    expect(within(items[0]!).getByRole('link', { name: 'Nastavnički demo' })).toHaveAttribute(
      'href',
      '/teacher',
    );
    expect(within(items[1]!).getByRole('link', { name: 'Učenički demo' })).toHaveAttribute(
      'href',
      '/student',
    );
    expect(within(items[2]!).getByRole('link', { name: 'Roditeljski demo' })).toHaveAttribute(
      'href',
      '/parent',
    );
  });

  describe('mobile menu', () => {
    it('opens and closes with the menu button', async () => {
      const { user } = renderApp({ path: '/' });
      expect(getMenuButton()).toHaveAttribute('aria-expanded', 'false');
      expect(getMenu()).not.toBeInTheDocument();

      await user.click(getMenuButton());
      expect(getMenuButton()).toHaveAttribute('aria-expanded', 'true');
      expect(within(getMenu()!).getByRole('link', { name: 'O nama' })).toBeInTheDocument();
      // Sign-in stays visible in the header itself on every screen size.
      expect(
        within(screen.getByRole('banner')).getByRole('link', { name: 'Prijavi se' }),
      ).toBeVisible();

      await user.click(getMenuButton());
      expect(getMenu()).not.toBeInTheDocument();
    });

    it('closes on Escape and returns focus to the menu button', async () => {
      const { user } = renderApp({ path: '/' });
      await user.click(getMenuButton());

      await user.keyboard('{Escape}');

      expect(getMenu()).not.toBeInTheDocument();
      expect(getMenuButton()).toHaveFocus();
    });

    it('closes after choosing a section', async () => {
      const { user } = renderApp({ path: '/' });
      await user.click(getMenuButton());

      await user.click(within(getMenu()!).getByRole('link', { name: 'Za koga je' }));

      expect(getMenu()).not.toBeInTheDocument();
    });
  });

  it('only contains links with a real destination', () => {
    renderApp({ path: '/' });

    for (const link of screen.getAllByRole('link')) {
      const href = link.getAttribute('href') ?? '';
      if (href.startsWith('#')) {
        expect(document.getElementById(href.slice(1)), href).toBeInTheDocument();
      } else {
        expect(['/', '/teacher', '/student', '/parent', '/login', '/school-request']).toContain(
          href,
        );
      }
    }
  });
});

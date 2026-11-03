import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/renderApp';

const sectionNavigation = [
  { name: 'Kako radi', id: 'kako-radi' },
  { name: 'Za koga je', id: 'za-koga-je' },
  { name: 'Pristupačnost', id: 'pristupacnost' },
];

function getMenuButton() {
  return screen.getByRole('button', { name: 'Meni' });
}

describe('LandingPage', () => {
  it('links header navigation to sections that exist on the page', () => {
    renderApp({ path: '/' });

    const header = screen.getByRole('banner');
    const nav = within(header).getByRole('navigation', { name: 'Navigacija po stranici' });
    for (const { name, id } of sectionNavigation) {
      expect(within(nav).getByRole('link', { name })).toHaveAttribute('href', `#${id}`);
      expect(document.getElementById(id)).toBeInTheDocument();
    }
  });

  it('opens the teacher demo from the hero action', async () => {
    const { user, router } = renderApp({ path: '/' });

    await user.click(screen.getAllByRole('link', { name: /Isprobaj nastavnički demo/ })[0]!);

    expect(router.state.location.pathname).toBe('/teacher');
    expect(screen.getByRole('heading', { level: 1, name: /Dobro došli/ })).toBeInTheDocument();
  });

  it('opens the teacher demo from the header button', async () => {
    const { user, router } = renderApp({ path: '/' });

    const header = screen.getByRole('banner');
    await user.click(within(header).getByRole('link', { name: 'Isprobaj demo' }));

    expect(router.state.location.pathname).toBe('/teacher');
  });

  it('points the secondary hero action to the "how it works" section', () => {
    renderApp({ path: '/' });
    expect(screen.getByRole('link', { name: /Kako funkcioniše/ })).toHaveAttribute(
      'href',
      '#kako-radi',
    );
  });

  describe('mobile menu', () => {
    it('opens and closes with the menu button', async () => {
      const { user } = renderApp({ path: '/' });
      const button = getMenuButton();
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(document.getElementById('site-mobile-menu')).not.toBeInTheDocument();

      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
      const menu = document.getElementById('site-mobile-menu')!;
      expect(within(menu).getByRole('link', { name: 'Kako radi' })).toBeInTheDocument();
      expect(within(menu).getByRole('link', { name: 'Isprobaj demo' })).toBeInTheDocument();

      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('closes on Escape and returns focus to the menu button', async () => {
      const { user } = renderApp({ path: '/' });
      await user.click(getMenuButton());

      await user.keyboard('{Escape}');

      expect(document.getElementById('site-mobile-menu')).not.toBeInTheDocument();
      expect(getMenuButton()).toHaveFocus();
    });

    it('closes after choosing a section', async () => {
      const { user } = renderApp({ path: '/' });
      await user.click(getMenuButton());

      const menu = document.getElementById('site-mobile-menu')!;
      await user.click(within(menu).getByRole('link', { name: 'Pristupačnost' }));

      expect(document.getElementById('site-mobile-menu')).not.toBeInTheDocument();
    });

    it('opens the teacher demo from the menu', async () => {
      const { user, router } = renderApp({ path: '/' });
      await user.click(getMenuButton());

      const menu = document.getElementById('site-mobile-menu')!;
      await user.click(within(menu).getByRole('link', { name: 'Isprobaj demo' }));

      expect(router.state.location.pathname).toBe('/teacher');
    });
  });

  it('labels the hero visual as illustrative', () => {
    renderApp({ path: '/' });
    const figure = screen.getByRole('figure');
    expect(figure).toHaveAccessibleName(/Ilustrativni prikaz/);
  });

  it('marks student and parent corners as coming soon, without links', () => {
    renderApp({ path: '/' });

    for (const name of ['Učenje koje se prilagođava meni', 'Podrška kod kuće, bez nagađanja']) {
      const corner = screen.getByRole('article', { name });
      expect(within(corner).getByText('U pripremi')).toBeInTheDocument();
      expect(within(corner).queryByRole('link')).not.toBeInTheDocument();
    }

    const teacher = screen.getByRole('article', {
      name: 'Manje vremena na pripremu, više vremena za učenike',
    });
    expect(within(teacher).getByText('Dostupno u demou')).toBeInTheDocument();
  });

  it('separates what works today from planned accessibility features', () => {
    renderApp({ path: '/' });
    const section = screen.getByRole('region', {
      name: 'Pristupačnost nije dodatak, već polazna tačka',
    });
    expect(within(section).getByRole('heading', { name: 'Već radi u demou' })).toBeInTheDocument();
    expect(within(section).getByRole('heading', { name: 'Planirano' })).toBeInTheDocument();
  });

  it('only contains links with a real destination', () => {
    renderApp({ path: '/' });

    for (const link of screen.getAllByRole('link')) {
      const href = link.getAttribute('href') ?? '';
      if (href.startsWith('#')) {
        expect(document.getElementById(href.slice(1)), href).toBeInTheDocument();
      } else {
        expect(['/', '/teacher']).toContain(href);
      }
    }
  });
});

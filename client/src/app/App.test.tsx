import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/renderApp';

describe('App routes', () => {
  it('redirects the root address to the teacher home page', () => {
    const { router } = renderApp({ path: '/' });
    expect(router.state.location.pathname).toBe('/teacher');
    expect(screen.getByRole('heading', { level: 1, name: /Dobro došli/ })).toBeInTheDocument();
  });

  it('shows a not-found page for an unknown address', () => {
    renderApp({ path: '/nepostojeca-stranica' });
    expect(
      screen.getByRole('heading', { level: 1, name: 'Stranica nije pronađena' }),
    ).toBeInTheDocument();
  });

  it('marks the current page in the navigation', () => {
    renderApp({ path: '/teacher' });
    expect(screen.getByRole('link', { name: 'Početna' })).toHaveAttribute('aria-current', 'page');
  });
});

import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { createQueryClient, SESSION_QUERY_KEY } from '@/shared/api/queryClient';
import { testUsers } from '@/test/authFixtures';
import { renderApp } from '@/test/renderApp';
import { routes } from './routes';

describe('App routes', () => {
  it('shows the public landing page at the root address', () => {
    const { router } = renderApp({ path: '/' });
    expect(router.state.location.pathname).toBe('/');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Učimo različito. Rastemo zajedno.' }),
    ).toBeInTheDocument();
  });

  it('keeps the teacher area at /teacher', () => {
    renderApp({ path: '/teacher' });
    expect(screen.getByRole('heading', { level: 1, name: 'Moji predmeti' })).toBeInTheDocument();
  });

  it('shows a public not-found page for an unknown address', async () => {
    const { user, router } = renderApp({ path: '/nepostojeca-stranica' });
    expect(
      screen.getByRole('heading', { level: 1, name: 'Stranica nije pronađena' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Nazad na početnu' }));
    expect(router.state.location.pathname).toBe('/');
  });

  it('shows a teacher not-found page for an unknown teacher address', async () => {
    const { user, router } = renderApp({ path: '/teacher/nepostojece' });
    await user.click(screen.getByRole('link', { name: 'Nazad na početnu' }));
    expect(router.state.location.pathname).toBe('/teacher');
  });

  it('marks the current page in the teacher navigation', () => {
    renderApp({ path: '/teacher' });
    expect(screen.getByRole('link', { name: 'Moji predmeti' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('links the logo in the teacher area to the public home page', async () => {
    const { user, router } = renderApp({ path: '/teacher' });
    await user.click(screen.getByRole('link', { name: 'IncluTeach – početna stranica' }));
    expect(router.state.location.pathname).toBe('/');
  });
});

describe('Code splitting', () => {
  it.each([
    ['/teacher', 'teacher', 'Moji predmeti'],
    ['/student', 'student', 'Moji predmeti'],
    ['/parent', 'parent', 'Moja djeca'],
  ] as const)('loads the %s area on demand', async (path, role, heading) => {
    const router = createMemoryRouter(routes, { initialEntries: [path] });
    const queryClient = createQueryClient();
    queryClient.setQueryData(SESSION_QUERY_KEY, testUsers[role]);
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });
});

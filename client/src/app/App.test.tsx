import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { DemoParentProvider } from '@/features/parent/data/DemoParentProvider';
import { DemoSchoolProvider } from '@/features/school/DemoSchoolProvider';
import { DemoStudentProvider } from '@/features/student/data/DemoStudentProvider';
import { describe, expect, it } from 'vitest';
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
    ['/teacher', 'Moji predmeti'],
    ['/student', 'Moji predmeti'],
    ['/parent', 'Moja djeca'],
  ])('loads the %s area on demand', async (path, heading) => {
    const router = createMemoryRouter(routes, { initialEntries: [path] });
    render(
      <DemoSchoolProvider aiDelayMs={0}>
        <DemoStudentProvider>
          <DemoParentProvider>
            <RouterProvider router={router} />
          </DemoParentProvider>
        </DemoStudentProvider>
      </DemoSchoolProvider>,
    );
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });
});

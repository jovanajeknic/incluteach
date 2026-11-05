import { QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { AuthUser, Role } from '@/features/auth/api/authApi';
import { createQueryClient, SESSION_QUERY_KEY } from '@/shared/api/queryClient';
import { testUsers } from './authFixtures';
import { eagerRoutes } from './eagerRoutes';

interface RenderAppOptions {
  path?: string;
  /**
   * Who is signed in. By default the person of the area the path opens (`/teacher` is a
   * teacher), and nobody for other paths. `null` means nobody; `'ask-server'` leaves the
   * question to `GET /auth/me`, which the test must then answer.
   */
  user?: AuthUser | null | 'ask-server';
}

const areaRoles: Record<string, Role> = {
  teacher: 'teacher',
  student: 'student',
  parent: 'parent',
  admin: 'admin',
};

function defaultUser(path: string): AuthUser | null {
  const area = path.split(/[/?#]/)[1] ?? '';
  const role = areaRoles[area];
  return role ? testUsers[role] : null;
}

/** Renders the real app routes in memory, starting at `path`. */
export function renderApp({
  path = '/teacher',
  user: sessionUser = defaultUser(path),
}: RenderAppOptions = {}) {
  const queryClient = createQueryClient();
  if (sessionUser !== 'ask-server') queryClient.setQueryData(SESSION_QUERY_KEY, sessionUser);

  const router = createMemoryRouter(eagerRoutes, { initialEntries: [path] });
  const user = userEvent.setup();
  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  /**
   * Moves the same browser window to another person's page: the session becomes that person's
   * (the real app would need a new sign-in for each).
   */
  const goAs = (role: Role, to: string) =>
    act(async () => {
      queryClient.setQueryData(SESSION_QUERY_KEY, testUsers[role]);
      await router.navigate(to);
    });
  return { ...result, router, user, queryClient, goAs };
}

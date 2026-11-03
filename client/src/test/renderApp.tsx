import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '@/app/routes';
import { DemoLessonsProvider } from '@/features/lessons/data/DemoLessonsProvider';
import type { Lesson } from '@/features/lessons/types';

interface RenderAppOptions {
  path?: string;
  lessons?: readonly Lesson[];
}

/** Renders the real app routes in memory, starting at `path`. */
export function renderApp({ path = '/teacher', lessons }: RenderAppOptions = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup();
  const result = render(
    <DemoLessonsProvider initialLessons={lessons}>
      <RouterProvider router={router} />
    </DemoLessonsProvider>,
  );
  return { ...result, router, user };
}

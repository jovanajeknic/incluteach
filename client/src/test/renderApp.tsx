import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '@/app/routes';
import { DemoLessonsProvider } from '@/features/lessons/data/DemoLessonsProvider';
import type { Lesson } from '@/features/lessons/types';
import { DemoStudentProvider } from '@/features/student/data/DemoStudentProvider';
import type { StudentLesson, StudentProfile } from '@/features/student/types';

interface RenderAppOptions {
  path?: string;
  lessons?: readonly Lesson[];
  student?: StudentProfile;
  studentLessons?: readonly StudentLesson[];
}

/** Renders the real app routes in memory, starting at `path`. */
export function renderApp({
  path = '/teacher',
  lessons,
  student,
  studentLessons,
}: RenderAppOptions = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup();
  const result = render(
    <DemoLessonsProvider initialLessons={lessons}>
      <DemoStudentProvider profile={student} lessons={studentLessons}>
        <RouterProvider router={router} />
      </DemoStudentProvider>
    </DemoLessonsProvider>,
  );
  return { ...result, router, user };
}

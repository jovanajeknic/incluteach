import { QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { eagerRoutes } from './eagerRoutes';
import { testUsers } from './authFixtures';
import type { AuthUser, Role } from '@/features/auth/api/authApi';
import { createQueryClient, SESSION_QUERY_KEY } from '@/shared/api/queryClient';
import { DemoParentProvider } from '@/features/parent/data/DemoParentProvider';
import { demoSchoolData, demoStudent } from '@/features/school/demoSchoolData';
import type { AiService } from '@/features/school/demoAiService';
import { DemoSchoolProvider } from '@/features/school/DemoSchoolProvider';
import type { SchoolData } from '@/features/school/types';
import { DemoStudentProvider } from '@/features/student/data/DemoStudentProvider';
import type { SupportProfile } from '@/features/student/types';

interface RenderAppOptions {
  path?: string;
  /** Start from different school data (defaults to the demo school). */
  school?: SchoolData;
  /** Override the demo student's needs, e.g. to test the standard lesson version. */
  studentNeeds?: Partial<SupportProfile>;
  /** The simulated AI answers at once in tests unless a delay is needed. */
  aiDelayMs?: number;
  /** Replaces the simulated AI, e.g. with one that fails. */
  aiService?: AiService;
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
  school = demoSchoolData,
  studentNeeds,
  aiDelayMs = 0,
  aiService,
  user: sessionUser = defaultUser(path),
}: RenderAppOptions = {}) {
  const queryClient = createQueryClient();
  if (sessionUser !== 'ask-server') queryClient.setQueryData(SESSION_QUERY_KEY, sessionUser);
  const data: SchoolData = studentNeeds
    ? {
        ...school,
        students: school.students.map((student) =>
          student.id === demoStudent.id
            ? { ...student, supportProfile: { ...student.supportProfile, ...studentNeeds } }
            : student,
        ),
      }
    : school;
  const router = createMemoryRouter(eagerRoutes, { initialEntries: [path] });
  const user = userEvent.setup();
  const result = render(
    <QueryClientProvider client={queryClient}>
      <DemoSchoolProvider initialData={data} aiDelayMs={aiDelayMs} aiService={aiService}>
        <DemoStudentProvider>
          <DemoParentProvider>
            <RouterProvider router={router} />
          </DemoParentProvider>
        </DemoStudentProvider>
      </DemoSchoolProvider>
    </QueryClientProvider>,
  );
  /**
   * Moves the same browser window to another person's page. The demo screens share one
   * school, so a test can follow one story through the teacher, the student and the parent;
   * the real app would need a new sign-in for each.
   */
  const goAs = (role: Role, to: string) =>
    act(async () => {
      queryClient.setQueryData(SESSION_QUERY_KEY, testUsers[role]);
      await router.navigate(to);
    });
  return { ...result, router, user, queryClient, goAs };
}

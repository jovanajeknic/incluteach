import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { eagerRoutes } from './eagerRoutes';
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
}

/** Renders the real app routes in memory, starting at `path`. */
export function renderApp({
  path = '/teacher',
  school = demoSchoolData,
  studentNeeds,
  aiDelayMs = 0,
  aiService,
}: RenderAppOptions = {}) {
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
    <DemoSchoolProvider initialData={data} aiDelayMs={aiDelayMs} aiService={aiService}>
      <DemoStudentProvider>
        <DemoParentProvider>
          <RouterProvider router={router} />
        </DemoParentProvider>
      </DemoStudentProvider>
    </DemoSchoolProvider>,
  );
  return { ...result, router, user };
}

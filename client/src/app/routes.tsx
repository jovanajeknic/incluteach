import type { ComponentType } from 'react';
import { type RouteObject } from 'react-router';
import { adminHomePath } from '@/features/admin/paths';
import { RequireRole } from '@/features/auth/components/RequireRole';
import { activatePath, loginPath } from '@/features/auth/paths';
import { schoolRequestPath } from '@/features/school-request/paths';
import { LandingPage } from '@/features/landing/LandingPage';
import { teacherHomePath } from '@/features/lessons/paths';
import { parentHomePath } from '@/features/parent/paths';
import { studentHomePath } from '@/features/student/paths';
import { PublicLayout } from './layout/PublicLayout';
import { NotFoundPage } from './pages/NotFoundPage';
import { RouteErrorPage } from './pages/RouteErrorPage';

/**
 * Each role area is one chunk, downloaded only when one of its pages opens, so visitors of
 * the landing page do not load the teacher, student and parent screens and their libraries.
 */
function fromArea<Area>(load: () => Promise<Area>, pick: (area: Area) => ComponentType) {
  return async () => ({ Component: pick(await load()) });
}

const teacherArea = () => import('./areas/teacherArea');
const studentArea = () => import('./areas/studentArea');
const parentArea = () => import('./areas/parentArea');

export const routes: RouteObject[] = [
  {
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: <LandingPage /> },
      // Auth pages bring their own layout and are loaded on demand, so the form libraries
      // (React Hook Form, Zod) are not downloaded by visitors who never open them.
      {
        path: loginPath,
        lazy: async () => ({
          Component: (await import('@/features/auth/pages/LoginPage')).LoginPage,
        }),
      },
      {
        path: activatePath,
        lazy: async () => ({
          Component: (await import('@/features/auth/pages/ActivatePage')).ActivatePage,
        }),
      },
      {
        path: schoolRequestPath,
        lazy: async () => ({
          Component: (await import('@/features/school-request/SchoolRequestPage'))
            .SchoolRequestPage,
        }),
      },
      {
        element: <RequireRole role="teacher" />,
        children: [
          {
            path: teacherHomePath,
            lazy: fromArea(teacherArea, (area) => area.TeacherLayout),
            children: [
              { index: true, lazy: fromArea(teacherArea, (area) => area.TeacherHomePage) },
              {
                path: 'subjects/:subjectId',
                lazy: fromArea(teacherArea, (area) => area.SubjectLessonsPage),
              },
              { path: 'lessons/new', lazy: fromArea(teacherArea, (area) => area.NewLessonPage) },
              {
                path: 'lessons/:lessonId',
                lazy: fromArea(teacherArea, (area) => area.LessonPage),
              },
              { path: 'class', lazy: fromArea(teacherArea, (area) => area.ClassPage) },
              {
                path: 'students/:studentId',
                lazy: fromArea(teacherArea, (area) => area.TeacherStudentPage),
              },
              {
                path: 'suggestions',
                lazy: fromArea(teacherArea, (area) => area.SuggestionsInboxPage),
              },
              { path: '*', element: <NotFoundPage homePath={teacherHomePath} /> },
            ],
          },
        ],
      },
      {
        element: <RequireRole role="student" />,
        children: [
          {
            path: studentHomePath,
            lazy: fromArea(studentArea, (area) => area.StudentLayout),
            children: [
              { index: true, lazy: fromArea(studentArea, (area) => area.StudentHomePage) },
              {
                path: 'subjects/:subjectId',
                lazy: fromArea(studentArea, (area) => area.SubjectPage),
              },
              { path: 'stars', lazy: fromArea(studentArea, (area) => area.StarsPage) },
              {
                path: 'lessons/:lessonId',
                lazy: fromArea(studentArea, (area) => area.StudentLessonPage),
              },
              {
                path: 'lessons/:lessonId/quiz',
                lazy: fromArea(studentArea, (area) => area.StudentQuizPage),
              },
              { path: '*', element: <NotFoundPage homePath={studentHomePath} /> },
            ],
          },
        ],
      },
      {
        element: <RequireRole role="parent" />,
        children: [
          {
            path: parentHomePath,
            lazy: fromArea(parentArea, (area) => area.ParentLayout),
            children: [
              { index: true, lazy: fromArea(parentArea, (area) => area.ParentHomePage) },
              { path: 'children/:childId', lazy: fromArea(parentArea, (area) => area.ChildPage) },
              {
                path: 'suggestions',
                lazy: fromArea(parentArea, (area) => area.ParentSuggestionsPage),
              },
              {
                path: 'children/:childId/lessons/:lessonId',
                lazy: fromArea(parentArea, (area) => area.ChildLessonPage),
              },
              { path: '*', element: <NotFoundPage homePath={parentHomePath} /> },
            ],
          },
        ],
      },
      {
        element: <RequireRole role="admin" />,
        children: [
          {
            path: adminHomePath,
            lazy: async () => ({
              Component: (await import('@/features/admin/AdminHomePage')).AdminHomePage,
            }),
          },
        ],
      },
      {
        element: <PublicLayout />,
        children: [{ path: '*', element: <NotFoundPage homePath="/" /> }],
      },
    ],
  },
];

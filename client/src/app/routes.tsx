import { type RouteObject } from 'react-router';
import { loginPath, registerPath } from '@/features/auth/paths';
import { LandingPage } from '@/features/landing/LandingPage';
import { LessonDetailPage } from '@/features/lessons/pages/LessonDetailPage';
import { NewLessonPage } from '@/features/lessons/pages/NewLessonPage';
import { TeacherDashboardPage } from '@/features/lessons/pages/TeacherDashboardPage';
import { teacherHomePath } from '@/features/lessons/paths';
import { PublicLayout } from './layout/PublicLayout';
import { TeacherLayout } from './layout/TeacherLayout';
import { NotFoundPage } from './pages/NotFoundPage';
import { RouteErrorPage } from './pages/RouteErrorPage';

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
        path: registerPath,
        lazy: async () => ({
          Component: (await import('@/features/auth/pages/RegisterPage')).RegisterPage,
        }),
      },
      {
        path: teacherHomePath,
        element: <TeacherLayout />,
        children: [
          { index: true, element: <TeacherDashboardPage /> },
          { path: 'lessons/new', element: <NewLessonPage /> },
          { path: 'lessons/:lessonId', element: <LessonDetailPage /> },
          { path: '*', element: <NotFoundPage homePath={teacherHomePath} /> },
        ],
      },
      {
        element: <PublicLayout />,
        children: [{ path: '*', element: <NotFoundPage homePath="/" /> }],
      },
    ],
  },
];

import { type RouteObject } from 'react-router';
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

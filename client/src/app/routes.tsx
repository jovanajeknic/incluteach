import { Navigate, type RouteObject } from 'react-router';
import { LessonDetailPage } from '@/features/lessons/pages/LessonDetailPage';
import { NewLessonPage } from '@/features/lessons/pages/NewLessonPage';
import { TeacherDashboardPage } from '@/features/lessons/pages/TeacherDashboardPage';
import { teacherHomePath } from '@/features/lessons/paths';
import { TeacherLayout } from './layout/TeacherLayout';
import { NotFoundPage } from './pages/NotFoundPage';
import { RouteErrorPage } from './pages/RouteErrorPage';

// Only the teacher area exists so far, so its layout wraps every route.
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <TeacherLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate to={teacherHomePath} replace /> },
      { path: 'teacher', element: <TeacherDashboardPage /> },
      { path: 'teacher/lessons/new', element: <NewLessonPage /> },
      { path: 'teacher/lessons/:lessonId', element: <LessonDetailPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

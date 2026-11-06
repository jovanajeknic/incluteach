import type { ComponentType } from 'react';
import { Navigate, type RouteObject } from 'react-router';
import { adminHomePath, adminUsersPath } from '@/features/admin/paths';
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
const adminArea = () => import('./areas/adminArea');

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
              { path: 'requests', lazy: fromArea(teacherArea, (area) => area.RequestsPage) },
              {
                path: 'subjects/:subjectId/students',
                lazy: fromArea(teacherArea, (area) => area.SubjectStudentsPage),
              },
              {
                path: 'subjects/:subjectId/students/:studentId',
                lazy: fromArea(teacherArea, (area) => area.StudentPage),
              },
              { path: 'messages', lazy: fromArea(teacherArea, (area) => area.MessagesPage) },
              {
                path: 'subjects/:subjectId/students/:studentId/conversation',
                lazy: fromArea(teacherArea, (area) => area.ConversationPage),
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
              { path: 'join', lazy: fromArea(studentArea, (area) => area.JoinPage) },
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
                path: 'requests',
                lazy: fromArea(parentArea, (area) => area.ParentRequestsPage),
              },
              {
                path: 'messages',
                lazy: fromArea(parentArea, (area) => area.ParentMessagesPage),
              },
              {
                path: 'children/:childId/subjects/:subjectId/conversation',
                lazy: fromArea(parentArea, (area) => area.ParentConversationPage),
              },
              {
                path: 'children/:childId/join',
                lazy: fromArea(parentArea, (area) => area.ChildJoinPage),
              },
              {
                path: 'children/:childId/lessons/:lessonId',
                lazy: fromArea(parentArea, (area) => area.ChildLessonPage),
              },
              {
                path: 'children/:childId/subjects/:subjectId',
                lazy: fromArea(parentArea, (area) => area.ChildSubjectPage),
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
            lazy: fromArea(adminArea, (area) => area.AdminLayout),
            children: [
              { index: true, element: <Navigate to={adminUsersPath} replace /> },
              { path: 'users', lazy: fromArea(adminArea, (area) => area.UsersPage) },
              { path: 'classes', lazy: fromArea(adminArea, (area) => area.ClassesPage) },
              { path: 'users/new', lazy: fromArea(adminArea, (area) => area.NewUserPage) },
              { path: '*', element: <NotFoundPage homePath={adminHomePath} /> },
            ],
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

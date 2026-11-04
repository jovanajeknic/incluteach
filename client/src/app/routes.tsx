import { type RouteObject } from 'react-router';
import { loginPath, registerPath } from '@/features/auth/paths';
import { ClassPage } from '@/features/class-overview/pages/ClassPage';
import { SuggestionsInboxPage } from '@/features/class-overview/pages/SuggestionsInboxPage';
import { TeacherStudentPage } from '@/features/class-overview/pages/TeacherStudentPage';
import { LandingPage } from '@/features/landing/LandingPage';
import { LessonDetailPage } from '@/features/lessons/pages/LessonDetailPage';
import { NewLessonPage } from '@/features/lessons/pages/NewLessonPage';
import { TeacherHomePage } from '@/features/lessons/pages/TeacherHomePage';
import { CoursePage } from '@/features/lessons/pages/CoursePage';
import { teacherHomePath } from '@/features/lessons/paths';
import { StudentHomePage } from '@/features/student/pages/StudentHomePage';
import { StudentLessonPage } from '@/features/student/pages/StudentLessonPage';
import { StarsPage } from '@/features/student/pages/StarsPage';
import { StudentQuizPage } from '@/features/student/pages/StudentQuizPage';
import { SubjectPage } from '@/features/student/pages/SubjectPage';
import { studentHomePath } from '@/features/student/paths';
import { ChildLessonPage } from '@/features/parent/pages/ChildLessonPage';
import { ChildPage } from '@/features/parent/pages/ChildPage';
import { ParentHomePage } from '@/features/parent/pages/ParentHomePage';
import { parentHomePath } from '@/features/parent/paths';
import { ParentLayout } from './layout/ParentLayout';
import { PublicLayout } from './layout/PublicLayout';
import { StudentLayout } from './layout/StudentLayout';
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
          { index: true, element: <TeacherHomePage /> },
          { path: 'subjects/:subjectId/classes/:classId', element: <CoursePage /> },
          { path: 'lessons/new', element: <NewLessonPage /> },
          { path: 'lessons/:lessonId', element: <LessonDetailPage /> },
          { path: 'class', element: <ClassPage /> },
          { path: 'students/:studentId', element: <TeacherStudentPage /> },
          { path: 'suggestions', element: <SuggestionsInboxPage /> },
          { path: '*', element: <NotFoundPage homePath={teacherHomePath} /> },
        ],
      },
      {
        path: studentHomePath,
        element: <StudentLayout />,
        children: [
          { index: true, element: <StudentHomePage /> },
          { path: 'subjects/:subjectId', element: <SubjectPage /> },
          { path: 'stars', element: <StarsPage /> },
          { path: 'lessons/:lessonId', element: <StudentLessonPage /> },
          { path: 'lessons/:lessonId/quiz', element: <StudentQuizPage /> },
          { path: '*', element: <NotFoundPage homePath={studentHomePath} /> },
        ],
      },
      {
        path: parentHomePath,
        element: <ParentLayout />,
        children: [
          { index: true, element: <ParentHomePage /> },
          { path: 'children/:childId', element: <ChildPage /> },
          { path: 'children/:childId/lessons/:lessonId', element: <ChildLessonPage /> },
          { path: '*', element: <NotFoundPage homePath={parentHomePath} /> },
        ],
      },
      {
        element: <PublicLayout />,
        children: [{ path: '*', element: <NotFoundPage homePath="/" /> }],
      },
    ],
  },
];

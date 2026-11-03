import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { pickLessonVersion } from '../lessonVersion';
import type { LessonProgress, StudentLesson, StudentProfile, Subject } from '../types';
import { demoStudent, demoStudentLessons, demoSubjects } from './demoStudentData';
import { StudentContext, type StudentStore } from './studentContext';

interface DemoStudentProviderProps {
  children: ReactNode;
  /** Lets tests start from known data. */
  profile?: StudentProfile;
  subjects?: readonly Subject[];
  lessons?: readonly StudentLesson[];
}

/**
 * Demo-only student store kept in React state above the router: progress survives
 * navigation but is intentionally lost on page reload.
 */
export function DemoStudentProvider({
  children,
  profile = demoStudent,
  subjects = demoSubjects,
  lessons: allLessons = demoStudentLessons,
}: DemoStudentProviderProps) {
  const [progress, setProgress] = useState<Record<string, LessonProgress>>({});

  const lessons = useMemo(
    () => allLessons.filter((lesson) => pickLessonVersion(lesson, profile.supportProfile)),
    [allLessons, profile],
  );

  const markStarted = useCallback((lessonId: string) => {
    setProgress((current) => (current[lessonId] ? current : { ...current, [lessonId]: 'started' }));
  }, []);

  const markCompleted = useCallback((lessonId: string) => {
    setProgress((current) => ({ ...current, [lessonId]: 'completed' }));
  }, []);

  const store = useMemo<StudentStore>(
    () => ({
      profile,
      subjects,
      lessons,
      getSubject: (id) => subjects.find((subject) => subject.id === id),
      getLesson: (id) => lessons.find((lesson) => lesson.id === id),
      lessonsForSubject: (subjectId) => lessons.filter((lesson) => lesson.subjectId === subjectId),
      progressOf: (lessonId) => progress[lessonId] ?? 'new',
      markStarted,
      markCompleted,
      stars: Object.values(progress).filter((status) => status === 'completed').length,
    }),
    [profile, subjects, lessons, progress, markStarted, markCompleted],
  );

  return <StudentContext value={store}>{children}</StudentContext>;
}

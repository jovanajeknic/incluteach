import { createContext, useContext } from 'react';
import type {
  LessonProgress,
  PracticeRecord,
  StudentLesson,
  StudentProfile,
  Subject,
} from '../types';

/**
 * What student screens may do. Screens depend only on this interface,
 * so the in-memory demo store can later be replaced by API calls without changing them.
 */
export interface StudentStore {
  profile: StudentProfile;
  subjects: readonly Subject[];
  /** Only lessons with at least one teacher-approved version. */
  lessons: readonly StudentLesson[];
  getSubject: (id: string) => Subject | undefined;
  getLesson: (id: string) => StudentLesson | undefined;
  lessonsForSubject: (subjectId: string) => StudentLesson[];
  progressOf: (lessonId: string) => LessonProgress;
  markStarted: (lessonId: string) => void;
  practiceOf: (lessonId: string) => PracticeRecord | undefined;
  /** The student says they have gone through the lesson. */
  markLessonDone: (lessonId: string) => void;
  recordPractice: (lessonId: string, difficultQuestionIds: readonly string[]) => void;
  /** Stars for effort: one for a lesson marked as done, one for its finished quiz. No score. */
  stars: number;
  starsFor: (lessonId: string) => { lesson: boolean; quiz: boolean };
}

export const StudentContext = createContext<StudentStore | null>(null);

export function useStudent(): StudentStore {
  const store = useContext(StudentContext);
  if (!store) {
    throw new Error('useStudent must be used inside <DemoStudentProvider>');
  }
  return store;
}

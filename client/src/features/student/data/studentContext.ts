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
  markCompleted: (lessonId: string, difficultQuestionIds: readonly string[]) => void;
  /** One star per lesson whose practice was finished; there is no score or ranking. */
  stars: number;
}

export const StudentContext = createContext<StudentStore | null>(null);

export function useStudent(): StudentStore {
  const store = useContext(StudentContext);
  if (!store) {
    throw new Error('useStudent must be used inside <DemoStudentProvider>');
  }
  return store;
}

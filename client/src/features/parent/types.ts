import type {
  LessonProgress,
  PracticeRecord,
  StudentLesson,
  StudentProfile,
} from '@/features/student/types';

export type { ParentProfile, Suggestion } from '@/features/school/types';

/** Everything a parent may see about one linked child. */
export interface ChildData {
  profile: StudentProfile;
  /** Lessons assigned to this child with a teacher-approved version. */
  lessons: readonly StudentLesson[];
  progressOf: (lessonId: string) => LessonProgress;
  practiceOf: (lessonId: string) => PracticeRecord | undefined;
  className?: string;
  /** Stars for effort, counted the same way the child sees them. */
  stars: number;
}

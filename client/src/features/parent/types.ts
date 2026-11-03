import type {
  LessonProgress,
  PracticeRecord,
  StudentLesson,
  StudentProfile,
} from '@/features/student/types';

// Provisional shapes: they will be aligned with the API contract once it is agreed with the backend.

export interface ParentProfile {
  id: string;
  firstName: string;
  lastName: string;
  /** Children linked to this parent. In the real app the backend decides these links. */
  childIds: string[];
}

/**
 * A parent's free-text note on what helps their child. It goes to the teacher first; the
 * teacher decides how the AI should use it. It is never shown to the child or other pupils.
 */
export interface Suggestion {
  id: string;
  childId: string;
  lessonId?: string;
  text: string;
  createdAt: string;
  status: 'pending-teacher';
}

/** Everything a parent may see about one linked child. */
export interface ChildData {
  profile: StudentProfile;
  /** Lessons with a teacher-approved version for this child. */
  lessons: readonly StudentLesson[];
  progressOf: (lessonId: string) => LessonProgress;
  practiceOf: (lessonId: string) => PracticeRecord | undefined;
}

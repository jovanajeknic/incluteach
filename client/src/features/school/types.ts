import type {
  LessonProgress,
  LessonVersionKind,
  PracticeRecord,
  StudentLesson,
  StudentProfile,
} from '@/features/student/types';

// Provisional shapes: they will be aligned with the API contract once it is agreed with the backend.

/**
 * draft: only the teacher's text. processing: the AI is preparing adaptations.
 * in_review: AI suggestions wait for the teacher. approved: the teacher approved them.
 * assigned: students can see it.
 */
export const LESSON_STATUSES = [
  'draft',
  'processing',
  'in_review',
  'approved',
  'assigned',
] as const;
export type LessonStatus = (typeof LESSON_STATUSES)[number];

/** Versions the AI can add next to the teacher's text. */
export const ADAPTED_KINDS = [
  'simplified',
  'examples',
] as const satisfies readonly LessonVersionKind[];
export type AdaptedKind = (typeof ADAPTED_KINDS)[number];

export interface SchoolLesson extends StudentLesson {
  status: LessonStatus;
  /** How many AI adaptations have finished; editors reload their drafts when it changes. */
  adaptationCount?: number;
  assignedClassIds: string[];
  assignedStudentIds: string[];
}

export interface ClassGroup {
  id: string;
  name: string;
  grade: number;
  studentIds: string[];
}

export interface TeacherProfile {
  id: string;
  firstName: string;
  lastName: string;
  classIds: string[];
}

export interface ParentProfile {
  id: string;
  firstName: string;
  lastName: string;
  /** Children linked to this parent. In the real app the backend decides these links. */
  childIds: string[];
}

/**
 * pending-teacher: not read yet. use-for-adaptation: the teacher passes it to the AI for the
 * next adaptation. read: the teacher has read it.
 */
export type SuggestionStatus = 'pending-teacher' | 'use-for-adaptation' | 'read';

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
  status: SuggestionStatus;
}

export interface SchoolData {
  teacher: TeacherProfile;
  parent: ParentProfile;
  classes: ClassGroup[];
  students: StudentProfile[];
  lessons: SchoolLesson[];
  /** studentId -> lessonId -> progress */
  progress: Record<string, Record<string, LessonProgress>>;
  /** studentId -> lessonId -> latest practice */
  practice: Record<string, Record<string, PracticeRecord>>;
  suggestions: Suggestion[];
}

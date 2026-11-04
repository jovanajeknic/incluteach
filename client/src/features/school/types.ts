import type {
  LessonProgress,
  LessonVersionKind,
  PracticeRecord,
  StudentLesson,
  StudentProfile,
} from '@/features/student/types';

// Provisional shapes: they will be aligned with the API contract once it is agreed with the backend.

/**
 * draft: only the teacher's text. processing: the AI is preparing the versions.
 * in_review: AI versions wait for the teacher. approved: every version is approved.
 * assigned: published, so the students of the lesson's class can see it.
 */
export const LESSON_STATUSES = [
  'draft',
  'processing',
  'in_review',
  'approved',
  'assigned',
] as const;
export type LessonStatus = (typeof LESSON_STATUSES)[number];

/** Everything the AI prepares next to the teacher's text, in the order the teacher reviews it. */
export const ADAPTED_KINDS = [
  'shortened',
  'easier',
  'dyslexia',
  'audio',
  'illustrations',
] as const satisfies readonly LessonVersionKind[];
export type AdaptedKind = (typeof ADAPTED_KINDS)[number];

/** What students and parents see: a copy made when the teacher publishes. */
export type PublishedContent = Pick<
  StudentLesson,
  'versions' | 'glossary' | 'quiz' | 'homeGuidance'
>;

/**
 * The fields inherited from StudentLesson are the teacher's working copy. Students never
 * read them directly: they read `published`, so nothing reaches them before the teacher
 * has approved it and pressed "Objavi".
 */
export interface SchoolLesson extends StudentLesson {
  status: LessonStatus;
  /** A lesson belongs to one subject in one class; publishing sends it to that class. */
  classId: string;
  /** How many full AI runs have finished; editors reload their drafts when it changes. */
  adaptationCount?: number;
  /** Versions the AI is redoing right now after the teacher's feedback. */
  regenerating?: AdaptedKind[];
  /** The AI also writes quiz questions and word explanations; they need approval too. */
  extrasApproved?: boolean;
  /** Set once published; changes to the working copy wait here until published again. */
  published?: PublishedContent;
  /** The last AI request failed: for every version, or for one. */
  aiFailed?: 'all' | AdaptedKind;
}

export interface ClassGroup {
  id: string;
  name: string;
  grade: number;
  studentIds: string[];
  /** The class teacher ("razredni starešina"), who keeps the students' version profiles. */
  classTeacherId?: string;
}

/** One subject the teacher teaches in one class. A class teacher has several per class. */
export interface TeachingAssignment {
  subjectId: string;
  classId: string;
}

export interface TeacherProfile {
  id: string;
  firstName: string;
  lastName: string;
  teaching: TeachingAssignment[];
}

/** Classes the teacher teaches anything in, in first-seen order. */
export function teacherClassIds(teacher: TeacherProfile): string[] {
  return [...new Set(teacher.teaching.map((item) => item.classId))];
}

export interface ParentProfile {
  id: string;
  firstName: string;
  lastName: string;
  /** Children linked to this parent. In the real app the backend decides these links. */
  childIds: string[];
}

/**
 * pending-teacher: not read yet. use-for-adaptation: the teacher wrote an instruction for
 * the AI because of it. read: the teacher has read it.
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
  /**
   * What the teacher tells the AI because of this suggestion, in their own words. The AI
   * only ever gets this note: never the parent's text or the child's name.
   */
  aiNote?: string;
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

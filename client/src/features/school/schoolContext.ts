import { createContext, useContext } from 'react';
import type {
  LessonProgress,
  LessonVersion,
  LessonVersionKind,
  PracticeRecord,
  StudentProfile,
  Subject,
  SupportProfile,
} from '@/features/student/types';
import {
  ADAPTED_KINDS,
  type AdaptedKind,
  type ClassGroup,
  type PublishedContent,
  type SchoolData,
  type SchoolLesson,
  type Suggestion,
  type SuggestionStatus,
} from './types';

export interface NewLessonInput {
  title: string;
  subjectId: string;
  classId: string;
  content: string;
}

export interface NewSuggestion {
  childId: string;
  lessonId?: string;
  text: string;
}

export type LessonEdits = Partial<Pick<SchoolLesson, 'glossary' | 'quiz' | 'homeGuidance'>>;
export type VersionEdits = Partial<Pick<LessonVersion, 'content' | 'illustrations'>>;

/**
 * The single demo "school": teacher, student and parent screens all read and change the same
 * data, so approving and publishing a lesson really reaches the student and parent views.
 * Every screen depends on this interface, so the demo can later be replaced by API calls.
 */
export interface SchoolStore {
  data: SchoolData;
  subjects: readonly Subject[];
  getStudent: (id: string) => StudentProfile | undefined;
  getLesson: (id: string) => SchoolLesson | undefined;
  getClass: (id: string) => ClassGroup | undefined;
  getSubject: (id: string) => Subject | undefined;
  classOf: (studentId: string) => ClassGroup | undefined;
  /** Whether the teacher teaches this student in any subject. */
  teachesStudent: (studentId: string) => boolean;
  /** Whether the teacher teaches this subject in this class. */
  teachesCourse: (subjectId: string, classId: string) => boolean;
  /** Only the class teacher changes which versions a student receives. */
  isClassTeacherOf: (studentId: string) => boolean;
  /**
   * Published lessons of a student that this teacher may follow: every subject for the
   * class teacher, otherwise only the subjects this teacher teaches in that class.
   */
  lessonsVisibleToTeacher: (studentId: string) => SchoolLesson[];

  // Teacher
  /** Saves the teacher's text and starts the AI right away. */
  createLesson: (input: NewLessonInput) => SchoolLesson;
  /** Runs the AI for every version (a new lesson, or after the teacher changed the text). */
  generateAll: (lessonId: string) => Promise<void>;
  /** Asks the AI to redo one version, taking the teacher's note into account. */
  regenerateVersion: (lessonId: string, kind: AdaptedKind, feedback: string) => Promise<void>;
  updateVersion: (lessonId: string, kind: LessonVersionKind, edits: VersionEdits) => void;
  approveVersion: (lessonId: string, kind: AdaptedKind) => void;
  /** Approves the quiz questions, word explanations and home tips. */
  approveExtras: (lessonId: string) => void;
  /**
   * Sends a fully approved lesson to its class, or replaces what the class sees with the
   * approved changes. Each student gets their own version.
   */
  publishLesson: (lessonId: string) => void;
  updateLesson: (lessonId: string, edits: LessonEdits) => void;
  studentsOf: (classId: string) => StudentProfile[];
  /** How many of the lesson's students receive each version. Counts only, never names. */
  versionAudience: (lesson: SchoolLesson) => Record<AdaptedKind, number>;
  /** Parent suggestions the teacher marked for use, for the lesson's students. */
  suggestionsForAdaptation: (lesson: SchoolLesson) => Suggestion[];
  setStudentSupport: (studentId: string, profile: SupportProfile) => void;
  setSuggestionStatus: (suggestionId: string, status: SuggestionStatus) => void;

  // Students and parents
  visibleLessonsFor: (studentId: string) => SchoolLesson[];
  progressOf: (studentId: string, lessonId: string) => LessonProgress;
  practiceOf: (studentId: string, lessonId: string) => PracticeRecord | undefined;
  markStarted: (studentId: string, lessonId: string) => void;
  /** The student marks the lesson as read through. */
  markLessonDone: (studentId: string, lessonId: string) => void;
  /** The student finished the lesson quiz. */
  recordPractice: (
    studentId: string,
    lessonId: string,
    difficultQuestionIds: readonly string[],
  ) => void;
  /** One star for each lesson marked as done and one for each finished quiz. */
  starsOf: (studentId: string) => number;
  addSuggestion: (suggestion: NewSuggestion) => void;
}

export const SchoolContext = createContext<SchoolStore | null>(null);

export function useSchool(): SchoolStore {
  const store = useContext(SchoolContext);
  if (!store) {
    throw new Error('useSchool must be used inside <DemoSchoolProvider>');
  }
  return store;
}

export function findVersion(
  lesson: SchoolLesson,
  kind: LessonVersionKind,
): LessonVersion | undefined {
  return lesson.versions.find((version) => version.kind === kind);
}

/** An AI version counts as approved only if it was approved for the current teacher text. */
export function isVersionApproved(lesson: SchoolLesson, kind: LessonVersionKind): boolean {
  const version = findVersion(lesson, kind);
  return version !== undefined && version.approvedByTeacher && !version.stale;
}

/** What the teacher approves before publishing: every AI version plus quiz and words. */
export function approvalProgress(lesson: SchoolLesson): { approved: number; total: number } {
  const versions = ADAPTED_KINDS.filter((kind) => isVersionApproved(lesson, kind)).length;
  return {
    approved: versions + (lesson.extrasApproved ? 1 : 0),
    total: ADAPTED_KINDS.length + 1,
  };
}

/** Everything the AI prepared is approved, so the lesson may be published. */
export function isFullyApproved(lesson: SchoolLesson): boolean {
  const { approved, total } = approvalProgress(lesson);
  return approved === total;
}

/** The content as it would be published now. */
export function publishableContent(lesson: SchoolLesson): PublishedContent {
  return {
    versions: lesson.versions.filter(
      (version) => version.kind === 'standard' || (version.approvedByTeacher && !version.stale),
    ),
    glossary: lesson.glossary,
    quiz: lesson.quiz,
    homeGuidance: lesson.homeGuidance,
  };
}

/** A published lesson whose working copy has changed since it was published. */
export function hasUnpublishedChanges(lesson: SchoolLesson): boolean {
  if (!lesson.published) return false;
  return (
    JSON.stringify(publishableContent(lesson)) !== JSON.stringify(lesson.published) ||
    lesson.versions.some((version) => !version.approvedByTeacher || version.stale) ||
    !lesson.extrasApproved
  );
}

/** The lesson as students and parents see it: the published copy, never the working one. */
export function publishedView(lesson: SchoolLesson): SchoolLesson | undefined {
  if (lesson.status !== 'assigned' || !lesson.published) return undefined;
  return { ...lesson, ...lesson.published };
}

/** The teacher has something to look at: AI work waiting, or changes not yet published. */
export function needsReview(lesson: SchoolLesson): boolean {
  if (lesson.status === 'processing' || lesson.status === 'draft') return false;
  if (lesson.status === 'assigned') return hasUnpublishedChanges(lesson);
  return !isFullyApproved(lesson) || lesson.status === 'in_review';
}

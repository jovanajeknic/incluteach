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

  // Teacher
  /** Saves the teacher's text and starts the AI right away. */
  createLesson: (input: NewLessonInput) => SchoolLesson;
  /** Runs the AI for every version (a new lesson, or after the teacher changed the text). */
  generateAll: (lessonId: string) => Promise<void>;
  /** Asks the AI to redo one version, taking the teacher's note into account. */
  regenerateVersion: (lessonId: string, kind: AdaptedKind, feedback: string) => Promise<void>;
  updateVersion: (lessonId: string, kind: LessonVersionKind, edits: VersionEdits) => void;
  approveVersion: (lessonId: string, kind: AdaptedKind) => void;
  /** Sends a fully approved lesson to its class; each student gets their own version. */
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

/** AI versions the teacher has approved, out of all the AI prepares. */
export function approvalProgress(lesson: SchoolLesson): { approved: number; total: number } {
  return {
    approved: ADAPTED_KINDS.filter((kind) => findVersion(lesson, kind)?.approvedByTeacher).length,
    total: ADAPTED_KINDS.length,
  };
}

/** Every AI version exists and is approved, so the lesson may go to students. */
export function isFullyApproved(lesson: SchoolLesson): boolean {
  const { approved, total } = approvalProgress(lesson);
  return approved === total;
}

/** The teacher has something to look at: finished AI work that is not approved yet. */
export function needsReview(lesson: SchoolLesson): boolean {
  if (lesson.status === 'processing' || lesson.status === 'draft') return false;
  return (
    lesson.status === 'in_review' || lesson.versions.some((version) => !version.approvedByTeacher)
  );
}

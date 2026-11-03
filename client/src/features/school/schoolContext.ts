import { createContext, useContext } from 'react';
import type {
  LessonProgress,
  LessonVersionKind,
  PracticeRecord,
  StudentProfile,
  Subject,
  SupportProfile,
} from '@/features/student/types';
import type {
  AdaptedKind,
  ClassGroup,
  SchoolData,
  SchoolLesson,
  Suggestion,
  SuggestionStatus,
} from './types';

export interface NewLessonInput {
  title: string;
  subjectId: string;
  grade: number;
  content: string;
}

export interface NewSuggestion {
  childId: string;
  lessonId?: string;
  text: string;
}

export interface NeededVersion {
  kind: AdaptedKind;
  /** How many of the lesson's students need this version. Counts only, never names of needs. */
  studentCount: number;
}

export type LessonEdits = Partial<Pick<SchoolLesson, 'glossary' | 'quiz' | 'homeGuidance'>>;

/**
 * The single demo "school": teacher, student and parent screens all read and change the same
 * data, so approving and assigning a lesson really reaches the student and parent views.
 * Every screen depends on this interface, so the demo can later be replaced by API calls.
 */
export interface SchoolStore {
  data: SchoolData;
  subjects: readonly Subject[];
  getStudent: (id: string) => StudentProfile | undefined;
  getLesson: (id: string) => SchoolLesson | undefined;
  getClass: (id: string) => ClassGroup | undefined;
  classOf: (studentId: string) => ClassGroup | undefined;

  // Teacher
  createDraft: (input: NewLessonInput) => SchoolLesson;
  updateVersionContent: (lessonId: string, kind: LessonVersionKind, content: string) => void;
  removeVersion: (lessonId: string, kind: LessonVersionKind) => void;
  updateLesson: (lessonId: string, edits: LessonEdits) => void;
  /** Students the lesson is meant for: those assigned, or the teacher's classes before that. */
  targetStudents: (lesson: SchoolLesson) => StudentProfile[];
  neededVersions: (lesson: SchoolLesson) => NeededVersion[];
  /** Parent suggestions the teacher marked for use, for the lesson's students. */
  suggestionsForAdaptation: (lesson: SchoolLesson) => Suggestion[];
  requestAdaptation: (lessonId: string) => Promise<void>;
  approveLesson: (lessonId: string) => void;
  assignLesson: (lessonId: string, target: { classIds: string[]; studentIds: string[] }) => void;
  setStudentNeeds: (studentId: string, needs: SupportProfile) => void;
  setSuggestionStatus: (suggestionId: string, status: SuggestionStatus) => void;

  // Students and parents
  visibleLessonsFor: (studentId: string) => SchoolLesson[];
  progressOf: (studentId: string, lessonId: string) => LessonProgress;
  practiceOf: (studentId: string, lessonId: string) => PracticeRecord | undefined;
  markStarted: (studentId: string, lessonId: string) => void;
  markCompleted: (
    studentId: string,
    lessonId: string,
    difficultQuestionIds: readonly string[],
  ) => void;
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

/** A lesson needs the teacher's attention while any version is still an unapproved suggestion. */
export function needsReview(lesson: SchoolLesson): boolean {
  return (
    lesson.status === 'in_review' || lesson.versions.some((version) => !version.approvedByTeacher)
  );
}

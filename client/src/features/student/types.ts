// Provisional shapes: they will be aligned with the API contract once it is agreed with the backend.

export type SubjectColor = 'mint' | 'blush' | 'butter' | 'lilac' | 'sky' | 'pistachio';
export type SubjectIcon = 'leaf' | 'calculator' | 'book' | 'globe' | 'palette';

export interface Subject {
  id: string;
  name: string;
  color: SubjectColor;
  icon: SubjectIcon;
}

/**
 * standard: the teacher's own text. The AI adds:
 * shortened: only the essentials. easier: the same content in simpler words and sentences.
 * dyslexia: short lines meant for the dyslexia-friendly font and wider spacing.
 * audio: a script written to be listened to. illustrations: pictures that fit the lesson.
 */
export type LessonVersionKind =
  'standard' | 'shortened' | 'easier' | 'dyslexia' | 'audio' | 'illustrations';

/** Versions a student reads; exactly one of them is chosen for each student. */
export const READING_VERSION_KINDS = ['standard', 'shortened', 'easier', 'dyslexia'] as const;
export type ReadingVersionKind = (typeof READING_VERSION_KINDS)[number];

export interface LessonIllustration {
  id: string;
  /** Path under /public. */
  src: string;
  alt: string;
  caption: string;
}

export interface LessonVersion {
  kind: LessonVersionKind;
  /** Plain text; a blank line separates paragraphs. Empty for illustrations. */
  content: string;
  illustrations?: LessonIllustration[];
  /** AI-adapted versions reach students only after a teacher approves them. */
  approvedByTeacher: boolean;
  /** Who wrote it; AI suggestions are labelled until the teacher approves them. */
  source: 'teacher' | 'ai';
}

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface StudentLesson {
  id: string;
  subjectId: string;
  grade: number;
  title: string;
  versions: LessonVersion[];
  glossary: GlossaryEntry[];
  quiz: QuizQuestion[];
  /** Short, teacher-approved tips for parents on practising at home. */
  homeGuidance?: string[];
}

/**
 * Which of the generated versions this student receives. Teachers set it together with the
 * parents. It holds choices only, never a diagnosis, and it is never shown to the student
 * or to other pupils: it only lets the system send the right version.
 */
export interface SupportProfile {
  readingVersion: ReadingVersionKind;
  /** Also receives the narrated audio version. */
  audio: boolean;
}

export interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  supportProfile: SupportProfile;
}

export type LessonProgress = 'new' | 'started' | 'completed';

/** The latest finished practice for a lesson. There is no score, by design. */
export interface PracticeRecord {
  completedAt: string;
  /** Questions answered wrongly on the first try, so parents know what to revisit. */
  difficultQuestionIds: string[];
}

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
 * standard: the teacher's own text. simplified: shorter, simpler sentences.
 * examples: the same content with more everyday examples.
 */
export type LessonVersionKind = 'standard' | 'simplified' | 'examples';

export interface LessonVersion {
  kind: LessonVersionKind;
  /** Plain text; a blank line separates paragraphs. */
  content: string;
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
 * What the student's lessons should adapt to. It deliberately contains needs, never
 * diagnoses, so no diagnosis can ever reach a screen.
 */
export interface SupportProfile {
  preferSimplifiedText: boolean;
  preferMoreExamples: boolean;
  preferStepByStep: boolean;
  readingPreset: 'standard' | 'easier-reading';
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

// Provisional shapes: they will be aligned with the API contract once it is agreed with the backend.

export type SubjectColor = 'mint' | 'blush' | 'butter' | 'lilac' | 'sky' | 'pistachio';
export type SubjectIcon = 'leaf' | 'calculator' | 'book' | 'globe' | 'palette';

export interface Subject {
  id: string;
  name: string;
  color: SubjectColor;
  icon: SubjectIcon;
}

export interface LessonVersion {
  kind: 'standard' | 'simplified';
  /** Plain text; a blank line separates paragraphs. */
  content: string;
  /** AI-adapted versions reach students only after a teacher approves them. */
  approvedByTeacher: boolean;
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
  title: string;
  versions: LessonVersion[];
  glossary: GlossaryEntry[];
  quiz: QuizQuestion[];
  /** Short, teacher-approved tips for parents on practising at home. */
  homeGuidance?: string[];
}

/**
 * What the student's lessons should adapt to. The backend derives it from what the school
 * and parents record; it deliberately contains needs, never diagnoses, so no diagnosis can
 * ever reach the student's screen.
 */
export interface SupportProfile {
  preferSimplifiedText: boolean;
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

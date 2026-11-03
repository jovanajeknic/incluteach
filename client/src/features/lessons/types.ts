// Provisional shapes: they will be aligned with the API contract once it is agreed with the backend.

export const LESSON_STATUSES = ['draft', 'in_review', 'approved', 'assigned'] as const;

export type LessonStatus = (typeof LESSON_STATUSES)[number];

/** Primary school grades in Montenegro run from 1 to 9. */
export const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export type Grade = (typeof GRADES)[number];

export interface Lesson {
  id: string;
  title: string;
  subject: string;
  grade: Grade;
  content: string;
  status: LessonStatus;
}

export type NewLessonInput = Pick<Lesson, 'title' | 'subject' | 'grade' | 'content'>;

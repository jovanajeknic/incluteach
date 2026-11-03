import { text } from '@/text/sr-Latn';
import { GRADES, type Grade, type NewLessonInput } from './types';

/** Raw form values exactly as the user typed or selected them. */
export interface LessonFormValues {
  title: string;
  subject: string;
  grade: string;
  content: string;
}

export type LessonFormField = keyof LessonFormValues;

export type LessonFormErrors = Partial<Record<LessonFormField, string>>;

export type LessonFormResult =
  { ok: true; data: NewLessonInput } | { ok: false; errors: LessonFormErrors };

export const emptyLessonForm: LessonFormValues = {
  title: '',
  subject: '',
  grade: '',
  content: '',
};

/** Field order used to decide which invalid field receives focus first. */
export const lessonFormFieldOrder: readonly LessonFormField[] = [
  'title',
  'subject',
  'grade',
  'content',
];

function parseGrade(value: string): Grade | undefined {
  return GRADES.find((grade) => String(grade) === value);
}

/**
 * Validates and normalizes the lesson form.
 * Values are trimmed, so input made only of spaces counts as empty.
 */
export function validateLessonForm(values: LessonFormValues): LessonFormResult {
  const title = values.title.trim();
  const subject = values.subject.trim();
  const content = values.content.trim();
  const grade = parseGrade(values.grade);
  const messages = text.newLesson.errors;

  const errors: LessonFormErrors = {};
  if (!title) errors.title = messages.titleRequired;
  if (!subject) errors.subject = messages.subjectRequired;
  if (!grade) errors.grade = messages.gradeRequired;
  if (!content) errors.content = messages.contentRequired;

  if (!grade || Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data: { title, subject, grade, content } };
}

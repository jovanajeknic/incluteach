import type { NewLessonInput } from '@/features/school/schoolContext';
import { text } from '@/text/sr-Latn';
import { GRADES, type Grade } from './types';

/** Raw form values exactly as the user typed or selected them. */
export interface LessonFormValues {
  title: string;
  subjectId: string;
  grade: string;
  content: string;
}

export type LessonFormField = keyof LessonFormValues;

export type LessonFormErrors = Partial<Record<LessonFormField, string>>;

export type LessonFormResult =
  { ok: true; data: NewLessonInput } | { ok: false; errors: LessonFormErrors };

export const emptyLessonForm: LessonFormValues = {
  title: '',
  subjectId: '',
  grade: '',
  content: '',
};

/** Field order used to decide which invalid field receives focus first. */
export const lessonFormFieldOrder: readonly LessonFormField[] = [
  'title',
  'subjectId',
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
export function validateLessonForm(
  values: LessonFormValues,
  subjectIds: readonly string[],
): LessonFormResult {
  const title = values.title.trim();
  const content = values.content.trim();
  const subjectId = subjectIds.includes(values.subjectId) ? values.subjectId : undefined;
  const grade = parseGrade(values.grade);
  const messages = text.newLesson.errors;

  const errors: LessonFormErrors = {};
  if (!title) errors.title = messages.titleRequired;
  if (!subjectId) errors.subjectId = messages.subjectRequired;
  if (!grade) errors.grade = messages.gradeRequired;
  if (!content) errors.content = messages.contentRequired;

  if (!subjectId || !grade || Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data: { title, subjectId, grade, content } };
}

import type { NewLessonInput } from '@/features/school/schoolContext';
import type { TeachingAssignment } from '@/features/school/types';
import { text } from '@/text/sr-Latn';

/** Raw form values exactly as the user typed or selected them. */
export interface LessonFormValues {
  /** A teaching assignment written as "subjectId|classId". */
  course: string;
  title: string;
  content: string;
}

export type LessonFormField = keyof LessonFormValues;

export type LessonFormErrors = Partial<Record<LessonFormField, string>>;

export type LessonFormResult =
  { ok: true; data: NewLessonInput } | { ok: false; errors: LessonFormErrors };

export const courseKey = ({ subjectId, classId }: TeachingAssignment) => `${subjectId}|${classId}`;

/** Field order used to decide which invalid field receives focus first. */
export const lessonFormFieldOrder: readonly LessonFormField[] = ['course', 'title', 'content'];

/**
 * Validates and normalizes the lesson form. Only subjects the teacher teaches in a class are
 * accepted, and text is trimmed, so input made only of spaces counts as empty.
 */
export function validateLessonForm(
  values: LessonFormValues,
  teaching: readonly TeachingAssignment[],
): LessonFormResult {
  const title = values.title.trim();
  const content = values.content.trim();
  const course = teaching.find((item) => courseKey(item) === values.course);
  const messages = text.newLesson.errors;

  const errors: LessonFormErrors = {};
  if (!course) errors.course = messages.courseRequired;
  if (!title) errors.title = messages.titleRequired;
  if (!content) errors.content = messages.contentRequired;

  if (!course || Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    data: { title, content, subjectId: course.subjectId, classId: course.classId },
  };
}

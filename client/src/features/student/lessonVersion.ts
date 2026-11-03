import type { LessonVersion, StudentLesson, SupportProfile } from './types';

/**
 * Chooses which version of a lesson the student sees. Only teacher-approved versions are
 * eligible. Preference order: simplified (if needed), with more examples (if needed), the
 * teacher's standard text. Returns undefined when nothing is approved, so the lesson stays hidden.
 */
export function pickLessonVersion(
  lesson: StudentLesson,
  profile: SupportProfile,
): LessonVersion | undefined {
  const approved = (kind: LessonVersion['kind']) =>
    lesson.versions.find((version) => version.kind === kind && version.approvedByTeacher);

  return (
    (profile.preferSimplifiedText ? approved('simplified') : undefined) ??
    (profile.preferMoreExamples ? approved('examples') : undefined) ??
    approved('standard') ??
    approved('simplified') ??
    approved('examples')
  );
}

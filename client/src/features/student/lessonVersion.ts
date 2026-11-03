import type { LessonVersion, StudentLesson, SupportProfile } from './types';

/**
 * Chooses which version of a lesson the student sees. Only teacher-approved versions are
 * eligible; a simplified version is preferred when the support profile asks for it.
 * Returns undefined when no version is approved yet, so the lesson stays hidden.
 */
export function pickLessonVersion(
  lesson: StudentLesson,
  profile: SupportProfile,
): LessonVersion | undefined {
  const approved = lesson.versions.filter((version) => version.approvedByTeacher);
  const simplified = approved.find((version) => version.kind === 'simplified');
  const standard = approved.find((version) => version.kind === 'standard');
  return (profile.preferSimplifiedText ? simplified : undefined) ?? standard ?? simplified;
}

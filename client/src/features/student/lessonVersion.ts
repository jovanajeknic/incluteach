import type { LessonVersion, LessonVersionKind, StudentLesson, SupportProfile } from './types';

/** The teacher-approved version of a kind, if there is one. */
export function approvedVersion(
  lesson: StudentLesson,
  kind: LessonVersionKind,
): LessonVersion | undefined {
  return lesson.versions.find((version) => version.kind === kind && version.approvedByTeacher);
}

/**
 * Chooses which text the student reads: the version their profile names, once the teacher
 * has approved it, otherwise the teacher's own text. Returns undefined when nothing is
 * approved, so the lesson stays hidden.
 */
export function pickLessonVersion(
  lesson: StudentLesson,
  profile: SupportProfile,
): LessonVersion | undefined {
  return approvedVersion(lesson, profile.readingVersion) ?? approvedVersion(lesson, 'standard');
}

/** The narrated script, only for students who receive audio and only once approved. */
export function pickAudioVersion(
  lesson: StudentLesson,
  profile: SupportProfile,
): LessonVersion | undefined {
  return profile.audio ? approvedVersion(lesson, 'audio') : undefined;
}

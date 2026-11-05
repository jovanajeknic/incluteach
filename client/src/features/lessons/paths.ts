export const teacherHomePath = '/teacher';
export const newLessonPath = '/teacher/lessons/new';
/** Opens the new-lesson form with the subject already chosen. */
export const newLessonForPath = (subjectId: string) =>
  `${newLessonPath}?${new URLSearchParams({ subject: subjectId })}`;
export const lessonPath = (lessonId: string) => `/teacher/lessons/${encodeURIComponent(lessonId)}`;
/** The lessons of one subject (a subject already belongs to exactly one odeljenje). */
export const subjectLessonsPath = (subjectId: string) =>
  `/teacher/subjects/${encodeURIComponent(subjectId)}`;
/**
 * The students of a subject. `odjeljenje` is what the filter shows: a subject id of the same
 * name in another odeljenje, or "sva" for all of them. Without it, the subject's own odeljenje.
 */
export const subjectStudentsPath = (subjectId: string, odjeljenje?: string) =>
  `${subjectLessonsPath(subjectId)}/students${
    odjeljenje ? `?${new URLSearchParams({ odjeljenje })}` : ''
  }`;
export const subjectStudentPath = (subjectId: string, studentId: string) =>
  `${subjectLessonsPath(subjectId)}/students/${encodeURIComponent(studentId)}`;
export const requestsPath = '/teacher/requests';
export const messagesPath = '/teacher/messages';
/** The conversation with the parents of one student about one subject. */
export const conversationPath = (subjectId: string, studentId: string) =>
  `${subjectStudentPath(subjectId, studentId)}/conversation`;

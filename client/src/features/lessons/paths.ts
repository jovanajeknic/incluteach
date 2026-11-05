export const teacherHomePath = '/teacher';
export const newLessonPath = '/teacher/lessons/new';
/** Opens the new-lesson form with the subject already chosen. */
export const newLessonForPath = (subjectId: string) =>
  `${newLessonPath}?${new URLSearchParams({ subject: subjectId })}`;
export const lessonPath = (lessonId: string) => `/teacher/lessons/${encodeURIComponent(lessonId)}`;
/** The lessons of one subject (a subject already belongs to exactly one odeljenje). */
export const subjectLessonsPath = (subjectId: string) =>
  `/teacher/subjects/${encodeURIComponent(subjectId)}`;
export const classPath = '/teacher/class';
export const teacherStudentPath = (studentId: string) =>
  `/teacher/students/${encodeURIComponent(studentId)}`;
export const suggestionsPath = '/teacher/suggestions';

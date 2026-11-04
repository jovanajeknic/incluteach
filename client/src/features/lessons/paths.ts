export const teacherHomePath = '/teacher';
export const newLessonPath = '/teacher/lessons/new';
/** Opens the new-lesson form with the subject and class already chosen. */
export const newLessonForPath = (subjectId: string, classId: string) =>
  `${newLessonPath}?${new URLSearchParams({ subject: subjectId, class: classId })}`;
export const lessonPath = (lessonId: string) => `/teacher/lessons/${encodeURIComponent(lessonId)}`;
export const coursePath = (subjectId: string, classId: string) =>
  `/teacher/subjects/${encodeURIComponent(subjectId)}/classes/${encodeURIComponent(classId)}`;
export const classPath = '/teacher/class';
export const teacherStudentPath = (studentId: string) =>
  `/teacher/students/${encodeURIComponent(studentId)}`;
export const suggestionsPath = '/teacher/suggestions';

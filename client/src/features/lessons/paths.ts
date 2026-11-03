export const teacherHomePath = '/teacher';
export const newLessonPath = '/teacher/lessons/new';
export const lessonPath = (lessonId: string) => `/teacher/lessons/${encodeURIComponent(lessonId)}`;
export const classPath = '/teacher/class';
export const teacherStudentPath = (studentId: string) =>
  `/teacher/students/${encodeURIComponent(studentId)}`;
export const suggestionsPath = '/teacher/suggestions';

export const teacherHomePath = '/teacher';
export const newLessonPath = '/teacher/lessons/new';
export const lessonPath = (lessonId: string) => `/teacher/lessons/${encodeURIComponent(lessonId)}`;

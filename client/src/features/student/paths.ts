export const studentHomePath = '/student';
export const subjectPath = (subjectId: string) =>
  `/student/subjects/${encodeURIComponent(subjectId)}`;
export const studentLessonPath = (lessonId: string) =>
  `/student/lessons/${encodeURIComponent(lessonId)}`;
export const studentQuizPath = (lessonId: string) => `${studentLessonPath(lessonId)}/quiz`;

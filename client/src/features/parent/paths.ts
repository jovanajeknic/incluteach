export const parentHomePath = '/parent';
export const parentSuggestionsPath = '/parent/suggestions';
export const childPath = (childId: string) => `/parent/children/${encodeURIComponent(childId)}`;
export const childLessonPath = (childId: string, lessonId: string) =>
  `${childPath(childId)}/lessons/${encodeURIComponent(lessonId)}`;

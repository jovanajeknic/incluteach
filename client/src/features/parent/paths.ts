export const parentHomePath = '/parent';
/** Requests of the children to join a subject, which wait for the parent. */
export const parentRequestsPath = '/parent/requests';
export const childPath = (childId: string) => `/parent/children/${encodeURIComponent(childId)}`;
/** Asking for a subject for one child. */
export const childJoinPath = (childId: string) => `${childPath(childId)}/join`;
/** A lesson of one child, to read and to see how the quiz went. */
export const childLessonPath = (childId: string, lessonId: string) =>
  `${childPath(childId)}/lessons/${encodeURIComponent(lessonId)}`;
/** The conversation with the teacher of one subject about one child. */
export const childConversationPath = (childId: string, subjectId: string) =>
  `${childPath(childId)}/subjects/${encodeURIComponent(subjectId)}/conversation`;
/** Every conversation of the parent that has a message. */
export const parentMessagesPath = '/parent/messages';
/** The lessons of one subject of one child. */
export const childSubjectPath = (childId: string, subjectId: string) =>
  `${childPath(childId)}/subjects/${encodeURIComponent(subjectId)}`;

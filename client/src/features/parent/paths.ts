export const parentHomePath = '/parent';
export const childPath = (childId: string) => `/parent/children/${encodeURIComponent(childId)}`;
/** Asking for a subject for one child. */
export const childJoinPath = (childId: string) => `${childPath(childId)}/join`;
/** The lessons of one subject of one child. */
export const childSubjectPath = (childId: string, subjectId: string) =>
  `${childPath(childId)}/subjects/${encodeURIComponent(subjectId)}`;

export type { LessonStatus, SchoolLesson } from '@/features/school/types';

/** Primary school grades in Montenegro run from 1 to 9. */
export const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export type Grade = (typeof GRADES)[number];

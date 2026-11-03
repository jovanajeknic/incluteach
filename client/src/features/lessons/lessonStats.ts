import type { Lesson } from './types';

export interface LessonStats {
  total: number;
  inReview: number;
  assigned: number;
}

export function computeLessonStats(lessons: readonly Lesson[]): LessonStats {
  return {
    total: lessons.length,
    inReview: lessons.filter((lesson) => lesson.status === 'in_review').length,
    assigned: lessons.filter((lesson) => lesson.status === 'assigned').length,
  };
}

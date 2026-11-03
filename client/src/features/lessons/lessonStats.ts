import { needsReview } from '@/features/school/schoolContext';
import type { SchoolLesson } from '@/features/school/types';

export interface LessonStats {
  total: number;
  inReview: number;
  assigned: number;
}

export function computeLessonStats(lessons: readonly SchoolLesson[]): LessonStats {
  return {
    total: lessons.length,
    inReview: lessons.filter(needsReview).length,
    assigned: lessons.filter((lesson) => lesson.status === 'assigned').length,
  };
}

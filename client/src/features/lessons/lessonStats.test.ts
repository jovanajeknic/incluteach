import { describe, expect, it } from 'vitest';
import { testLessons } from '@/test/lessonFixtures';
import { computeLessonStats } from './lessonStats';

describe('computeLessonStats', () => {
  it('counts lessons by status', () => {
    expect(computeLessonStats(testLessons)).toEqual({ total: 3, inReview: 1, assigned: 1 });
  });

  it('returns zeros for an empty list', () => {
    expect(computeLessonStats([])).toEqual({ total: 0, inReview: 0, assigned: 0 });
  });
});

import { describe, expect, it } from 'vitest';
import { testLessons } from '@/test/lessonFixtures';
import { computeLessonStats } from './lessonStats';

describe('computeLessonStats', () => {
  it('counts lessons needing review and assigned lessons', () => {
    expect(computeLessonStats(testLessons)).toEqual({ total: 3, inReview: 1, assigned: 1 });
  });

  it('counts an assigned lesson with an unapproved AI version as needing review', () => {
    const [first, second] = testLessons;
    const assignedWithPending = {
      ...second!,
      versions: [...second!.versions, { ...first!.versions[1]! }],
    };
    expect(computeLessonStats([assignedWithPending]).inReview).toBe(1);
  });

  it('returns zeros for an empty list', () => {
    expect(computeLessonStats([])).toEqual({ total: 0, inReview: 0, assigned: 0 });
  });
});

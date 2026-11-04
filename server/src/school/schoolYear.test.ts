import { describe, expect, it } from 'vitest';

import { currentSchoolYear } from './schoolYear.ts';

describe('currentSchoolYear', () => {
  it.each([
    ['2026-09-01T12:00:00+02:00', 2026],
    ['2026-12-31T12:00:00+01:00', 2026],
    ['2027-01-15T12:00:00+01:00', 2026],
    ['2027-06-30T12:00:00+02:00', 2026],
    ['2027-08-31T12:00:00+02:00', 2026],
    ['2027-09-01T12:00:00+02:00', 2027],
  ])('is the year the school year started in on %s', (date, expected) => {
    expect(currentSchoolYear(new Date(date))).toBe(expected);
  });

  it('changes at midnight in Serbia, not in UTC', () => {
    // 22:30 UTC on 31 August is already 00:30 on 1 September in Belgrade (summer time).
    expect(currentSchoolYear(new Date('2026-08-31T22:30:00Z'))).toBe(2026);
    expect(currentSchoolYear(new Date('2026-08-31T21:30:00Z'))).toBe(2025);
  });

  it('works without an argument', () => {
    const year = currentSchoolYear();

    expect(year).toBeGreaterThanOrEqual(2025);
    expect(Number.isInteger(year)).toBe(true);
  });
});

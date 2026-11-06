import { describe, expect, it } from 'vitest';
import { currentSchoolYear, schoolYearLabel } from './schoolYear';

describe('currentSchoolYear', () => {
  it.each([
    ['2026-08-31T10:00:00Z', 2025],
    ['2026-09-01T10:00:00Z', 2026],
    ['2026-11-06T10:00:00Z', 2026],
    ['2027-03-01T10:00:00Z', 2026],
    ['2027-08-31T10:00:00Z', 2026],
  ])('is the year the school year began in on %s', (when, expected) => {
    expect(currentSchoolYear(new Date(when))).toBe(expected);
  });

  it('changes at midnight in Belgrade, not in the browser', () => {
    // 22:30 UTC on 31 August is already 00:30 on 1 September in Belgrade (summer time).
    expect(currentSchoolYear(new Date('2026-08-31T22:30:00Z'))).toBe(2026);
    expect(currentSchoolYear(new Date('2026-08-31T21:30:00Z'))).toBe(2025);
  });
});

describe('schoolYearLabel', () => {
  it('writes the two years of a school year', () => {
    expect(schoolYearLabel(2026)).toBe('2026/27');
    expect(schoolYearLabel(2099)).toBe('2099/00');
    expect(schoolYearLabel(2008)).toBe('2008/09');
  });
});

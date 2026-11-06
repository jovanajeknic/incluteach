// The school year starts on 1 September, the same rule as the server's `currentSchoolYear`:
// in September 2026 the current year is 2026 (that is, 2026/27); in March 2027 it still is.
const SCHOOL_TIME_ZONE = 'Europe/Belgrade';
const FIRST_MONTH_OF_SCHOOL_YEAR = 9;

export function currentSchoolYear(now: Date = new Date()): number {
  // The date in the school's time zone, not the browser's, so the year changes at local midnight.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SCHOOL_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now);

  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  return month >= FIRST_MONTH_OF_SCHOOL_YEAR ? year : year - 1;
}

/** 2026 -> "2026/27". */
export function schoolYearLabel(year: number): string {
  return `${year}/${String((year + 1) % 100).padStart(2, '0')}`;
}

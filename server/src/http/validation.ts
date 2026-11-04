import { HttpError } from './errors.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

// A whole number from a query string such as "?limit=20". Missing gives the fallback.
export function readWholeNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value === undefined) {
    return fallback;
  }
  const number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new HttpError(400, 'invalid_request', 'A number in the request is not valid.');
  }
  return number;
}

// Text with surrounding spaces removed and inner runs of spaces made single, so
// "  Matematika   A " and "Matematika A" are the same. Returns null when it is not text or its
// length is outside min..max.
export function cleanText(value: unknown, min: number, max: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const text = value.trim().replace(/\s+/g, ' ');
  return text.length >= min && text.length <= max ? text : null;
}

import type { Subject, SubjectColor, SubjectIcon } from '@/shared/visual/subjectTypes';

const COLORS: readonly SubjectColor[] = ['mint', 'blush', 'butter', 'lilac', 'sky', 'pistachio'];

// The API has no colour or icon for a subject, so they are chosen from the name. The same
// name always looks the same, and the common school subjects get a fitting icon.
const ICON_BY_WORD: readonly [RegExp, SubjectIcon][] = [
  [/biolog|priro|nauk|hemij|fizik/i, 'leaf'],
  [/matemat|račun|racun|informat/i, 'calculator'],
  [/geograf|istorij|društv|drustv/i, 'globe'],
  [/likovn|muzi|crtanj|umjetn|umetn/i, 'palette'],
];

function hashOf(value: string): number {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return hash;
}

/** A subject of the API dressed with the colour and icon the cards and blobs expect. */
export function subjectAppearance(id: string, name: string): Subject {
  const icon = ICON_BY_WORD.find(([pattern]) => pattern.test(name))?.[1] ?? 'book';
  // By name only, so Matematika has one colour in every odeljenje.
  const color = COLORS[hashOf(name.toLowerCase()) % COLORS.length]!;
  return { id, name, color, icon };
}

/** "Ana Marković" -> "AM"; the first letters of the first and the last word. */
export function initialsOfName(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  return initialsOf(words[0]!, words.length > 1 ? words[words.length - 1]! : '');
}

/** "Ana", "Marković" -> "AM". */
export function initialsOf(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`;
}

const dateFormatter = new Intl.DateTimeFormat('sr-Latn-ME', { dateStyle: 'long' });

/** Readable date in Serbian Latin, e.g. "2. novembar 2026." */
export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate));
}

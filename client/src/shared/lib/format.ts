/** "Ana", "Marković" -> "AM". */
export function initialsOf(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`;
}

const dateFormatter = new Intl.DateTimeFormat('sr-Latn-ME', { dateStyle: 'long' });

/** Readable date in Serbian Latin, e.g. "2. novembar 2026." */
export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate));
}

// Usernames look like ime_prezime. They use only the characters the database allows
// (a-z, 0-9 and _), so names are turned into plain letters first.

const MAX_BASE_LENGTH = 35; // leaves room for a number at the end within the 40 allowed
const MIN_LENGTH = 3;
const MIN_BASE_LENGTH = 2;

const SERBIAN_CYRILLIC: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  ђ: 'dj',
  е: 'e',
  ж: 'z',
  з: 'z',
  и: 'i',
  ј: 'j',
  к: 'k',
  л: 'l',
  љ: 'lj',
  м: 'm',
  н: 'n',
  њ: 'nj',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  ћ: 'c',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'c',
  ч: 'c',
  џ: 'dz',
  ш: 's',
};

function toPlainLetters(word: string): string {
  return (
    word
      .toLowerCase()
      .replace(/[а-яђјљњћџ]/g, (letter) => SERBIAN_CYRILLIC[letter] ?? '')
      // "đ" is not a letter with an accent, so it has to be replaced by hand.
      .replace(/đ/g, 'dj')
      // Splits "č" into "c" and an accent mark, then drops the mark (also for ö, é, ñ ...).
      .normalize('NFD')
      .replace(/[^a-z0-9]/g, '')
  );
}

// "Ana Ivić" gives "ana_ivic". With more than two words only the first and the last are used.
// Returns null when the name has fewer than two letters or digits that can be turned into a
// username, for example a name written in a script that is not handled here.
export function usernameBase(fullName: string): string | null {
  const words = fullName.split(/\s+/).map(toPlainLetters).filter(Boolean);
  if (words.length === 0) {
    return null;
  }

  const base = words.length === 1 ? words[0] : `${words[0]}_${words[words.length - 1]}`;
  return base.length >= MIN_BASE_LENGTH ? base.slice(0, MAX_BASE_LENGTH) : null;
}

// The first free username: the base, then base2, base3 ... A number is also added when the
// base alone would be too short.
export function pickUsername(base: string, taken: ReadonlySet<string>): string {
  if (base.length >= MIN_LENGTH && !taken.has(base)) {
    return base;
  }

  for (let number = 2; ; number += 1) {
    const candidate = `${base}${number}`;
    if (candidate.length >= MIN_LENGTH && !taken.has(candidate)) {
      return candidate;
    }
  }
}

/**
 * Serbian in Latin or in Cyrillic. The two scripts match letter for letter, so a text can be
 * shown in either one without changing it on the server. The conversion is the one the server
 * uses to give the AI a Cyrillic lesson in Latin script (`server/src/ai/script.ts`); keep the
 * two in step if the rules ever change.
 */

export type Script = 'latin' | 'cyrillic';

// The standard Serbian table, Cyrillic to Latin. A letter of the Latin script is written with
// two characters for three of them (lj, nj, dž).
const CYRILLIC_TO_LATIN: Record<string, string> = {
  А: 'A',
  Б: 'B',
  В: 'V',
  Г: 'G',
  Д: 'D',
  Ђ: 'Đ',
  Е: 'E',
  Ж: 'Ž',
  З: 'Z',
  И: 'I',
  Ј: 'J',
  К: 'K',
  Л: 'L',
  Љ: 'Lj',
  М: 'M',
  Н: 'N',
  Њ: 'Nj',
  О: 'O',
  П: 'P',
  Р: 'R',
  С: 'S',
  Т: 'T',
  Ћ: 'Ć',
  У: 'U',
  Ф: 'F',
  Х: 'H',
  Ц: 'C',
  Ч: 'Č',
  Џ: 'Dž',
  Ш: 'Š',
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  ђ: 'đ',
  е: 'e',
  ж: 'ž',
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
  ћ: 'ć',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'c',
  ч: 'č',
  џ: 'dž',
  ш: 'š',
};

const LATIN_TO_CYRILLIC: Record<string, string> = Object.fromEntries(
  Object.entries(CYRILLIC_TO_LATIN)
    .filter(([, latin]) => latin.length === 1)
    .map(([cyrillic, latin]) => [latin, cyrillic]),
);

const DIGRAPHS: Record<string, string> = { lj: 'љ', nj: 'њ', dž: 'џ' };

// Words where "dž" is two letters (д and ж), not one (џ). They are rare: the prefixes nad-,
// od-, pod-, pred- and iz- in front of a word that starts with "ž".
const SEPARATE_LETTERS = /^(nad|od|pod|pred|izod)ž/i;

const isUpper = (character: string | undefined) =>
  character !== undefined && character !== character.toLowerCase();

export function cyrillicToLatin(text: string): string {
  const characters = [...text];
  return characters
    .map((character, index) => {
      const latin = CYRILLIC_TO_LATIN[character];
      if (latin === undefined) {
        return character;
      }
      // A capital letter of two characters next to another capital letter belongs to a word in
      // capitals: ЉУБАВ is LJUBAV, not LjUBAV.
      const inCapitals =
        latin.length === 2 &&
        isUpper(character) &&
        (isUpper(characters[index + 1]) || isUpper(characters[index - 1]));
      return inCapitals ? latin.toUpperCase() : latin;
    })
    .join('');
}

// Latin letters that Serbian does not use. A word with one of them is a foreign word and stays
// as it is, since turning only part of it would give a word of two scripts.
const NOT_SERBIAN = /[qwxy]/i;
const SERBIAN_WORD = /^[A-Za-zČĆŠŽĐčćšžđ]+$/;

// `keep` holds, in lower case, the words that were Latin in the text itself (English terms,
// names): they are not turned into Cyrillic, whatever their capitals.
export function latinToCyrillic(text: string, keep: ReadonlySet<string> = new Set()): string {
  return text.normalize('NFC').replace(/\p{L}+/gu, (word) => {
    if (keep.has(word.toLowerCase()) || !SERBIAN_WORD.test(word) || NOT_SERBIAN.test(word)) {
      return word;
    }
    const separate = SEPARATE_LETTERS.test(word);

    let result = '';
    for (let index = 0; index < word.length; index += 1) {
      const pair = word.slice(index, index + 2);
      const digraph = DIGRAPHS[pair.toLowerCase()];
      if (digraph !== undefined && !(separate && pair.toLowerCase() === 'dž')) {
        result += isUpper(pair[0]) ? digraph.toUpperCase() : digraph;
        index += 1;
      } else {
        const letter = word.charAt(index);
        result += LATIN_TO_CYRILLIC[letter] ?? letter;
      }
    }
    return result;
  });
}

// A text is in Cyrillic when most of its letters are.
export function isMostlyCyrillic(text: string): boolean {
  const cyrillic = text.match(/[Ѐ-ӿ]/g)?.length ?? 0;
  const latin = text.match(/[A-Za-zČĆŠŽĐčćšžđ]/g)?.length ?? 0;
  return cyrillic > latin;
}

/**
 * The text in the script the reader chose. A text written in Cyrillic keeps its Latin words
 * (names, English terms) when shown in Cyrillic; a text written in Latin is turned letter for
 * letter. Nothing else changes: spaces, line breaks, numbers and signs stay as they are.
 */
export function displayInScript(text: string, script: Script): string {
  if (script === 'latin') {
    return cyrillicToLatin(text);
  }
  const keep = isMostlyCyrillic(text)
    ? new Set((text.match(/\p{Script=Latin}+/gu) ?? []).map((word) => word.toLowerCase()))
    : new Set<string>();
  return latinToCyrillic(text, keep);
}

import type { AiProvider } from './types.ts';

// The AI services write much better Serbian in Latin script than in Cyrillic: in Cyrillic they
// mix ekavian into an ijekavian text, make up words and put Latin look-alike letters inside
// words. The two scripts of Serbian match letter for letter, so a Cyrillic lesson is turned
// into Latin before the AI sees it, and what the AI writes is turned back into Cyrillic. The
// lesson text itself is never changed, only the new text the AI wrote.

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

// `keep` holds, in lower case, the words that were Latin in the lesson itself (English terms,
// names): they are not turned into Cyrillic when they come back, whatever their capitals.
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
        const letter = word[index];
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

type Convert = (text: string) => string;

// Applies `convert` to the texts of a summary or a quiz. The answers Tačno and Netačno of a
// true/false question stay as they are: they are always in Latin script, and the screen shows
// them in the script the child chose. Anything that is not the shape asked for is passed on
// unchanged and refused later by the checks.
function convertSummary(value: unknown, convert: Convert): unknown {
  const points = (value as { points?: unknown } | null)?.points;
  if (!Array.isArray(points)) {
    return value;
  }
  return {
    ...(value as object),
    points: points.map((point) => (typeof point === 'string' ? convert(point) : point)),
  };
}

function convertQuiz(value: unknown, convert: Convert): unknown {
  const questions = (value as { questions?: unknown } | null)?.questions;
  if (!Array.isArray(questions)) {
    return value;
  }
  const text = (item: unknown) => (typeof item === 'string' ? convert(item) : item);

  return {
    ...(value as object),
    questions: questions.map((question: unknown) => {
      const given = question as {
        kind?: unknown;
        prompt?: unknown;
        explanation?: unknown;
        options?: unknown;
      } | null;
      if (given === null || typeof given !== 'object') {
        return question;
      }
      return {
        ...given,
        prompt: text(given.prompt),
        explanation: text(given.explanation),
        options:
          Array.isArray(given.options) && given.kind !== 'true_false'
            ? given.options.map((option: unknown) =>
                option !== null && typeof option === 'object'
                  ? { ...option, text: text((option as { text?: unknown }).text) }
                  : option,
              )
            : given.options,
      };
    }),
  };
}

// Makes a provider work on Latin script for a lesson in Cyrillic. A lesson in Latin goes through
// untouched.
export function withLatinScript(provider: AiProvider): AiProvider {
  async function through(
    text: string,
    ask: (latin: string) => Promise<unknown>,
    convertAnswer: (value: unknown, convert: Convert) => unknown,
  ): Promise<unknown> {
    if (!isMostlyCyrillic(text)) {
      return ask(text);
    }
    // Words that were Latin in the lesson (names, English terms) stay Latin on the way back.
    const keep = new Set(
      (text.match(/\p{Script=Latin}+/gu) ?? []).map((word) => word.toLowerCase()),
    );
    const answer = await ask(cyrillicToLatin(text));
    return convertAnswer(answer, (latin) => latinToCyrillic(latin, keep));
  }

  return {
    name: provider.name,
    makeSummary: ({ text }) =>
      through(text, (latin) => provider.makeSummary({ text: latin }), convertSummary),
    makeQuiz: ({ text }) =>
      through(text, (latin) => provider.makeQuiz({ text: latin }), convertQuiz),
  };
}

import { describe, expect, it } from 'vitest';
import {
  cyrillicToLatin,
  displayInScript,
  isMostlyCyrillic,
  latinToCyrillic,
} from './serbianScript';

// All 30 letters of the Serbian alphabet, in both scripts, in order.
const ALPHABET_CYRILLIC = 'абвгдђежзијклљмнњопрстћуфхцчџш';
const ALPHABET_LATIN = 'abvgdđežzijklljmnnjoprstćufhcčdžš';

describe('cyrillicToLatin', () => {
  it('turns every letter of the alphabet into its Latin letter', () => {
    expect(cyrillicToLatin(ALPHABET_CYRILLIC)).toBe(ALPHABET_LATIN);
    expect(cyrillicToLatin(ALPHABET_CYRILLIC.toUpperCase())).toBe(
      'ABVGDĐEŽZIJKLLJMNNJOPRSTĆUFHCČDŽŠ',
    );
  });

  it('writes a capital of two letters in capitals only inside a word in capitals', () => {
    expect(cyrillicToLatin('Љубав и Њива, Џак')).toBe('Ljubav i Njiva, Džak');
    expect(cyrillicToLatin('ЉУБАВ, ЊИВА, ЏАК')).toBe('LJUBAV, NJIVA, DŽAK');
    expect(cyrillicToLatin('Љ')).toBe('Lj');
  });

  it('leaves everything that is not a letter of the alphabet as it is', () => {
    expect(cyrillicToLatin('Вода 2024, 5%! (а) "б" Spotify – 1920–2020.\n')).toBe(
      'Voda 2024, 5%! (a) "b" Spotify – 1920–2020.\n',
    );
  });
});

describe('latinToCyrillic', () => {
  it('turns every letter of the alphabet into its Cyrillic letter', () => {
    expect(latinToCyrillic(ALPHABET_LATIN)).toBe(ALPHABET_CYRILLIC);
    expect(latinToCyrillic(ALPHABET_LATIN.toUpperCase())).toBe(ALPHABET_CYRILLIC.toUpperCase());
  });

  it('reads lj, nj and dž as one letter, in lower case, capitals and Title case', () => {
    expect(latinToCyrillic('ljubav njiva džep')).toBe('љубав њива џеп');
    expect(latinToCyrillic('Ljubav Njiva Džep')).toBe('Љубав Њива Џеп');
    expect(latinToCyrillic('LJUBAV NJIVA DŽEP')).toBe('ЉУБАВ ЊИВА ЏЕП');
  });

  it('reads dž as two letters in the few words where it is', () => {
    expect(latinToCyrillic('nadživjeti, nadžupan, Podžupan, džep')).toBe(
      'надживјети, наджупан, Поджупан, џеп',
    );
  });

  it('turns back what was turned into Latin, so the text does not change', () => {
    const sentences = [
      'Круг воде у природи. Сунце загријава мора, ријеке и језера, па се дио воде претвара у водену пару.',
      'Љубав према њиви: ЉУБАВ, ЊИВА, ЏАК и џеп. Ђорђе је ђак, а Чедомир иде на Ћуприју у Шабац.',
      'Ђ ђ Ћ ћ Ч ч Ш ш Ж ж Џ џ Љ љ Њ њ, 1920–2020, 5%!',
    ];

    for (const sentence of sentences) {
      expect(latinToCyrillic(cyrillicToLatin(sentence))).toBe(sentence);
    }
  });

  it('leaves the words that were Latin in the text, and only those', () => {
    const keep = new Set(['internet']);

    expect(latinToCyrillic('internet i televizija', keep)).toBe('internet и телевизија');
    expect(latinToCyrillic('internet i televizija')).toBe('интернет и телевизија');
    // The capitals of the word do not matter.
    expect(latinToCyrillic('Internet i INTERNET', keep)).toBe('Internet и INTERNET');
  });

  it('leaves a word with a letter that Serbian does not use, so no word has two scripts', () => {
    expect(latinToCyrillic('Xbox, Wikipedia, Python, quiz')).toBe('Xbox, Wikipedia, Python, quiz');
  });

  it('reads a letter written as two characters (c and a caron) as one letter', () => {
    expect(latinToCyrillic('čaša')).toBe('чаша');
  });

  it('leaves numbers and signs', () => {
    expect(latinToCyrillic('Voda 2024, 5%! (a) "b"')).toBe('Вода 2024, 5%! (а) "б"');
  });
});

describe('isMostlyCyrillic', () => {
  it('knows the script of a text by most of its letters', () => {
    expect(isMostlyCyrillic('Вода у природи стално путује.')).toBe(true);
    expect(isMostlyCyrillic('Voda u prirodi stalno putuje.')).toBe(false);
    expect(isMostlyCyrillic('Музика на Spotify платформи')).toBe(true);
    expect(isMostlyCyrillic('Muzika na платформи Spotify i Deezer')).toBe(false);
    expect(isMostlyCyrillic('1234 !?')).toBe(false);
    expect(isMostlyCyrillic('')).toBe(false);
  });
});

describe('displayInScript', () => {
  const latin = 'Voda u prirodi stalno putuje.\n\nLjubav, njiva i džep: 5 stvari!';
  const cyrillic = 'Вода у природи стално путује.\n\nЉубав, њива и џеп: 5 ствари!';

  it('shows a Latin text in Cyrillic and a Cyrillic text in Latin, keeping the layout', () => {
    expect(displayInScript(latin, 'cyrillic')).toBe(cyrillic);
    expect(displayInScript(cyrillic, 'latin')).toBe(latin);
  });

  it('leaves a text that is already in the wanted script as it is', () => {
    expect(displayInScript(latin, 'latin')).toBe(latin);
    expect(displayInScript(cyrillic, 'cyrillic')).toBe(cyrillic);
  });

  it('keeps the Latin words of a Cyrillic text when it is shown in Cyrillic', () => {
    const mixed = 'Музика на Spotify и YouTube платформама';
    expect(displayInScript(mixed, 'cyrillic')).toBe(mixed);
    expect(displayInScript(mixed, 'latin')).toBe('Muzika na Spotify i YouTube platformama');
  });

  it('turns the words of a Latin text, but leaves foreign words with letters Serbian lacks', () => {
    expect(displayInScript('Pogledaj Wikipedia i video', 'cyrillic')).toBe(
      'Погледај Wikipedia и видео',
    );
  });

  it('turns the answers Tačno and Netačno, which the server always keeps in Latin', () => {
    expect(displayInScript('Tačno', 'cyrillic')).toBe('Тачно');
    expect(displayInScript('Netačno', 'cyrillic')).toBe('Нетачно');
    expect(displayInScript('Тачно', 'latin')).toBe('Tačno');
  });

  it('does not change the number of sentences, so the highlighted sentence stays right', () => {
    const count = (text: string) => text.split(/[.!?]+/).filter((part) => part.trim()).length;
    expect(count(displayInScript(latin, 'cyrillic'))).toBe(count(latin));
    expect(count(displayInScript(cyrillic, 'latin'))).toBe(count(cyrillic));
  });
});

import { describe, expect, it } from 'vitest';

import { createGroqAi } from './groq.ts';
import { cyrillicToLatin, isMostlyCyrillic, latinToCyrillic, withLatinScript } from './script.ts';
import type { AiProvider } from './types.ts';
import { validateQuiz, validateSummary } from './validate.ts';

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

  it('turns back what was turned into Latin, so the lesson does not change', () => {
    const sentences = [
      'Круг воде у природи. Сунце загријава мора, ријеке и језера, па се дио воде претвара у водену пару.',
      'Љубав према њиви: ЉУБАВ, ЊИВА, ЏАК и џеп. Ђорђе је ђак, а Чедомир иде на Ћуприју у Шабац.',
      'Ђ ђ Ћ ћ Ч ч Ш ш Ж ж Џ џ Љ љ Њ њ, 1920–2020, 5%!',
    ];

    for (const sentence of sentences) {
      expect(latinToCyrillic(cyrillicToLatin(sentence))).toBe(sentence);
    }
  });

  it('leaves the words that were Latin in the lesson, and only those', () => {
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
    expect(latinToCyrillic('čaša')).toBe('чаша');
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

describe('withLatinScript', () => {
  // An AI that writes down what it was asked and answers with the given answers.
  function spy(answers: { summary?: unknown; quiz?: unknown }) {
    const asked: { task: string; text: string }[] = [];
    const ai: AiProvider = {
      name: 'spy',
      makeSummary: async ({ text }) => {
        asked.push({ task: 'summary', text });
        return answers.summary;
      },
      makeQuiz: async ({ text }) => {
        asked.push({ task: 'quiz', text });
        return answers.quiz;
      },
    };
    return { ai: withLatinScript(ai), asked };
  }

  const QUIZ = {
    questions: [
      {
        kind: 'choice',
        prompt: 'Kako se zove proces?',
        explanation: 'Zove se isparavanje.',
        options: [
          { text: 'isparavanje', isCorrect: true },
          { text: 'kondenzacija', isCorrect: false },
          { text: 'padavine', isCorrect: false },
        ],
      },
      {
        kind: 'true_false',
        prompt: 'Sunce zagrijava vodu.',
        explanation: 'Sunce zagrijava mora.',
        options: [
          { text: 'Tačno', isCorrect: true },
          { text: 'Netačno', isCorrect: false },
        ],
      },
    ],
  };

  it('keeps the name of the AI it wraps', () => {
    expect(spy({}).ai.name).toBe('spy');
  });

  it('gives the AI a Cyrillic lesson in Latin script and turns the summary back', async () => {
    const { ai, asked } = spy({
      summary: { points: ['Voda putuje.', 'Ljudi piju vodu iz rijeke.'] },
    });

    const result = await ai.makeSummary({ text: 'Вода путује. Људи пију воду из ријеке.' });

    expect(asked).toEqual([{ task: 'summary', text: 'Voda putuje. Ljudi piju vodu iz rijeke.' }]);
    expect(result).toEqual({ points: ['Вода путује.', 'Људи пију воду из ријеке.'] });
    expect(validateSummary(result).points).toHaveLength(2);
  });

  it('turns the quiz back, except the answers Tačno and Netačno', async () => {
    const { ai, asked } = spy({ quiz: QUIZ });

    const result = await ai.makeQuiz({ text: 'Сунце загријава мора.' });

    expect(asked[0].text).toBe('Sunce zagrijava mora.');
    expect(result).toEqual({
      questions: [
        {
          kind: 'choice',
          prompt: 'Како се зове процес?',
          explanation: 'Зове се испаравање.',
          options: [
            { text: 'испаравање', isCorrect: true },
            { text: 'кондензација', isCorrect: false },
            { text: 'падавине', isCorrect: false },
          ],
        },
        {
          kind: 'true_false',
          prompt: 'Сунце загријава воду.',
          explanation: 'Сунце загријава мора.',
          options: [
            { text: 'Tačno', isCorrect: true },
            { text: 'Netačno', isCorrect: false },
          ],
        },
      ],
    });
    // It is still a quiz that passes the checks of the server.
    expect(validateQuiz(result).questions[1].options.map((option) => option.text)).toEqual([
      'Tačno',
      'Netačno',
    ]);
  });

  it('leaves a lesson in Latin script alone, in and out', async () => {
    const summary = { points: ['Voda putuje.'] };
    const { ai, asked } = spy({ summary, quiz: QUIZ });

    const resultSummary = await ai.makeSummary({ text: 'Voda putuje.' });
    const resultQuiz = await ai.makeQuiz({ text: 'Voda putuje.' });

    expect(asked.map((entry) => entry.text)).toEqual(['Voda putuje.', 'Voda putuje.']);
    expect(resultSummary).toBe(summary);
    expect(resultQuiz).toBe(QUIZ);
  });

  it('keeps the words that were Latin in the Cyrillic lesson', async () => {
    const { ai, asked } = spy({
      summary: { points: ['Spotify i internet su pojmovi.', 'Muzika je tema.'] },
    });

    const result = await ai.makeSummary({ text: 'Музика и њена историја на Spotify и internet.' });

    expect(asked[0].text).toBe('Muzika i njena istorija na Spotify i internet.');
    expect(result).toEqual({
      points: ['Spotify и internet су појмови.', 'Музика је тема.'],
    });
  });

  it.each([
    ['text that is not JSON', 'Evo sažetka: ...'],
    ['nothing', null],
    ['points that are not a list', { points: 'Voda.' }],
    ['questions that are not a list', { questions: 'x' }],
    ['questions that are not questions', { questions: [null, 5, 'x'] }],
  ])('passes %s on unchanged, so the checks refuse it', async (_name, answer) => {
    const { ai } = spy({ summary: answer, quiz: answer });
    const text = 'Вода путује.';

    const summary = await ai.makeSummary({ text });
    const quiz = await ai.makeQuiz({ text });

    expect(summary).toEqual(answer);
    expect(quiz).toEqual(answer);
    expect(() => validateSummary(summary)).toThrow();
    expect(() => validateQuiz(quiz)).toThrow();
  });

  it('turns only the texts of a list of points, and leaves what is not text', async () => {
    const { ai } = spy({ summary: { points: [1, null, 'Voda.'] } });

    expect(await ai.makeSummary({ text: 'Вода путује.' })).toEqual({ points: [1, null, 'Вода.'] });
  });

  it('sends the real service only Latin script for a Cyrillic lesson', async () => {
    const bodies: { messages: { role: string; content: string }[] }[] = [];
    const groq = createGroqAi({
      apiKey: 'test-key-not-real',
      fetch: (async (_url: string, init: RequestInit) => {
        bodies.push(JSON.parse(init.body as string));
        return new Response(
          JSON.stringify({
            choices: [
              {
                finish_reason: 'stop',
                message: { content: JSON.stringify({ points: ['Voda putuje.'] }) },
              },
            ],
          }),
          { status: 200 },
        );
      }) as unknown as typeof fetch,
      log: () => {},
    });

    const result = await withLatinScript(groq).makeSummary({ text: 'Вода путује по природи.' });

    expect(bodies[0].messages[1].content).toBe('<lesson>\nVoda putuje po prirodi.\n</lesson>');
    expect(bodies[0].messages[1].content).not.toMatch(/[Ѐ-ӿ]/);
    expect(result).toEqual({ points: ['Вода путује.'] });
  });
});

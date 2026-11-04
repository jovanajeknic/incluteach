import { describe, expect, it } from 'vitest';

import { BAD_OUTPUT_MARKER, createFakeAi, FAIL_MARKER } from './fake.ts';
import { AI_PROVIDERS, createAiProvider } from './index.ts';
import { ContentError, validateQuiz, validateSummary } from './validate.ts';

const LESSON =
  'Fotosinteza je proces u kojem biljke prave hranu uz pomoć svjetlosti. ' +
  'Za to koriste vodu iz zemljišta i ugljen-dioksid iz vazduha. ' +
  'Proces se odvija u zelenim dijelovima biljke, najviše u lišću. ' +
  'Zelena boja potiče od hlorofila, koji hvata svjetlosnu energiju. ' +
  'Hlorofil se nalazi u sitnim ćelijskim organelama koje se zovu hloroplasti. ' +
  'Tokom fotosinteze nastaje glukoza, vrsta šećera koja biljci služi kao hrana. ' +
  'Pored glukoze, biljka ispušta kisik koji je potreban svim živim bićima. ' +
  'Bez fotosinteze na Zemlji ne bi bilo dovoljno kisika za disanje. ' +
  'Korijen upija vodu i mineralne materije iz zemlje. ' +
  'Voda putuje kroz stablo do lišća pomoću sitnih cjevčica. ' +
  'Ugljen-dioksid ulazi u list kroz sitne otvore koji se zovu stome. ' +
  'Noću biljke ne vrše fotosintezu jer nema svjetlosti. ' +
  'Zato biljke tokom dana proizvode više kisika nego noću. ' +
  'Šume se zato nazivaju plućima planete.';

const rejection = (run: () => unknown) => {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error('It did not fail.');
};

describe('validateSummary', () => {
  it('accepts points and tidies their spaces', () => {
    expect(validateSummary({ points: ['  Biljke   prave hranu. ', 'Treba im voda.'] })).toEqual({
      points: ['Biljke prave hranu.', 'Treba im voda.'],
    });
  });

  it('removes the NUL character', () => {
    expect(validateSummary({ points: [`a${String.fromCharCode(0)}b`] }).points).toEqual(['ab']);
  });

  it.each([
    ['nothing', undefined],
    ['no list', {}],
    ['an empty list', { points: [] }],
    ['a list that is not a list', { points: 'tačka' }],
    ['a point that is not text', { points: [5] }],
    ['a blank point', { points: ['Dobro.', '   '] }],
    ['a point that is too long', { points: ['x'.repeat(301)] }],
    ['more than 30 points', { points: Array.from({ length: 31 }, () => 'Tačka.') }],
  ])('refuses %s', (_name, value) => {
    expect(rejection(() => validateSummary(value))).toBeInstanceOf(ContentError);
  });

  it('accepts a point of 300 characters and 30 points', () => {
    expect(validateSummary({ points: ['x'.repeat(300)] }).points[0]).toHaveLength(300);
    expect(
      validateSummary({ points: Array.from({ length: 30 }, () => 'Tačka.') }).points,
    ).toHaveLength(30);
  });
});

describe('validateQuiz', () => {
  const choice = (overrides: object = {}) => ({
    kind: 'choice',
    prompt: 'Gdje nastaje glukoza?',
    explanation: 'U lišću.',
    options: [
      { text: 'u korijenu', isCorrect: false },
      { text: 'u lišću', isCorrect: true },
      { text: 'u stablu', isCorrect: false },
    ],
    ...overrides,
  });
  const trueFalse = (overrides: object = {}) => ({
    kind: 'true_false',
    prompt: 'Biljke ispuštaju kisik.',
    options: [
      { text: 'Tačno', isCorrect: true },
      { text: 'Netačno', isCorrect: false },
    ],
    ...overrides,
  });

  it('accepts a choice question and a true/false question', () => {
    const quiz = validateQuiz({ questions: [choice(), trueFalse()] });

    expect(quiz.questions).toHaveLength(2);
    expect(quiz.questions[0]).toMatchObject({ kind: 'choice', explanation: 'U lišću.' });
    expect(quiz.questions[1].explanation).toBeNull();
  });

  it('keeps the answers of a true/false question in one order, whatever order came in', () => {
    const swapped = trueFalse({
      options: [
        { text: 'netačno', isCorrect: true },
        { text: 'TAČNO', isCorrect: false },
      ],
    });

    expect(validateQuiz({ questions: [swapped] }).questions[0].options).toEqual([
      { text: 'Tačno', isCorrect: false },
      { text: 'Netačno', isCorrect: true },
    ]);
  });

  it('treats an empty explanation as none', () => {
    expect(
      validateQuiz({ questions: [choice({ explanation: '  ' })] }).questions[0].explanation,
    ).toBeNull();
  });

  it.each([
    ['no questions', undefined],
    ['an empty list', { questions: [] }],
    ['questions that are not a list', { questions: 'pitanje' }],
    ['more than 20 questions', { questions: Array.from({ length: 21 }, () => choice()) }],
    ['an unknown kind', { questions: [choice({ kind: 'essay' })] }],
    ['a blank question', { questions: [choice({ prompt: '   ' })] }],
    ['a question that is too long', { questions: [choice({ prompt: 'x'.repeat(501) })] }],
    ['an explanation that is too long', { questions: [choice({ explanation: 'x'.repeat(501) })] }],
    ['answers that are not a list', { questions: [choice({ options: 'a' })] }],
    [
      'an answer without the mark if it is right',
      { questions: [choice({ options: [{ text: 'a' }, { text: 'b' }, { text: 'c' }] })] },
    ],
    [
      'a choice question with 2 answers',
      {
        questions: [
          choice({
            options: [
              { text: 'a', isCorrect: true },
              { text: 'b', isCorrect: false },
            ],
          }),
        ],
      },
    ],
    [
      'a choice question with 5 answers',
      {
        questions: [
          choice({
            options: ['a', 'b', 'c', 'd', 'e'].map((text, index) => ({
              text,
              isCorrect: index === 0,
            })),
          }),
        ],
      },
    ],
    [
      'two answers that are the same',
      {
        questions: [
          choice({
            options: [
              { text: 'a', isCorrect: true },
              { text: 'A', isCorrect: false },
              { text: 'c', isCorrect: false },
            ],
          }),
        ],
      },
    ],
    [
      'no right answer',
      {
        questions: [
          choice({ options: ['a', 'b', 'c'].map((text) => ({ text, isCorrect: false })) }),
        ],
      },
    ],
    [
      'two right answers',
      {
        questions: [
          choice({ options: ['a', 'b', 'c'].map((text) => ({ text, isCorrect: true })) }),
        ],
      },
    ],
    [
      'a true/false question with other answers',
      {
        questions: [
          trueFalse({
            options: [
              { text: 'Da', isCorrect: true },
              { text: 'Ne', isCorrect: false },
            ],
          }),
        ],
      },
    ],
    [
      'a true/false question with 3 answers',
      {
        questions: [
          trueFalse({
            options: [
              { text: 'Tačno', isCorrect: true },
              { text: 'Netačno', isCorrect: false },
              { text: 'Možda', isCorrect: false },
            ],
          }),
        ],
      },
    ],
  ])('refuses %s', (_name, value) => {
    expect(rejection(() => validateQuiz(value))).toBeInstanceOf(ContentError);
  });
});

describe('the fake AI', () => {
  const ai = createFakeAi();

  it('makes a summary of 3 to 10 short points taken from the text', async () => {
    const summary = validateSummary(await ai.makeSummary({ text: LESSON }));

    expect(summary.points.length).toBeGreaterThanOrEqual(3);
    expect(summary.points.length).toBeLessThanOrEqual(10);
    for (const point of summary.points) {
      expect(point.length).toBeLessThanOrEqual(200);
      expect(LESSON).toContain(point.replace(/…$/, ''));
    }
  });

  it('makes fewer points for a short text, even a single one', async () => {
    const short = validateSummary(
      await ai.makeSummary({ text: 'Biljke prave hranu uz pomoć svjetlosti. Treba im i voda.' }),
    );
    const one = validateSummary(await ai.makeSummary({ text: 'Kratko.' }));

    expect(short.points).toHaveLength(1);
    expect(one.points).toEqual(['Kratko.']);
  });

  it('cannot summarize nothing', async () => {
    await expect(ai.makeSummary({ text: '   ' })).rejects.toThrow(/no text/);
  });

  it('makes a quiz of 5 to 10 valid questions', async () => {
    const quiz = validateQuiz(await ai.makeQuiz({ text: LESSON }));

    expect(quiz.questions.length).toBeGreaterThanOrEqual(5);
    expect(quiz.questions.length).toBeLessThanOrEqual(10);
    expect(new Set(quiz.questions.map((question) => question.kind))).toEqual(
      new Set(['choice', 'true_false']),
    );
  });

  it('makes true statements from the text, and false ones with one word changed', async () => {
    const quiz = validateQuiz(await ai.makeQuiz({ text: LESSON }));
    const statements = quiz.questions.filter((question) => question.kind === 'true_false');

    const sentences = LESSON.split(/(?<=[.])\s+/);
    for (const question of statements) {
      const isTrue = question.options.find((option) => option.isCorrect)?.text === 'Tačno';
      if (isTrue) {
        expect(sentences).toContain(question.prompt);
      } else {
        expect(sentences).not.toContain(question.prompt);
        const original = sentences.find(
          (sentence) =>
            sentence.split(' ').length === question.prompt.split(' ').length &&
            sentence.split(' ').filter((word, index) => word !== question.prompt.split(' ')[index])
              .length === 1,
        );
        expect(original).toBeDefined();
      }
    }
    expect(statements.some((question) => question.options[0].isCorrect)).toBe(true);
    expect(statements.some((question) => question.options[1].isCorrect)).toBe(true);
  });

  it('blanks out a word in the choice questions, and the right answer puts it back', async () => {
    const quiz = validateQuiz(await ai.makeQuiz({ text: LESSON }));
    const sentences = LESSON.split(/(?<=[.])\s+/);

    const cloze = quiz.questions.filter((question) => question.kind === 'choice');
    expect(cloze.length).toBeGreaterThan(0);
    for (const question of cloze) {
      expect(question.prompt).toContain('_____');
      const right = question.options.find((option) => option.isCorrect)?.text as string;
      expect(sentences).toContain(question.prompt.replace('_____', right));
    }
  });

  it('does not always put the right answer in the same place', async () => {
    const quiz = validateQuiz(await ai.makeQuiz({ text: LESSON }));

    const places = quiz.questions
      .filter((question) => question.kind === 'choice')
      .map((question) => question.options.findIndex((option) => option.isCorrect));
    expect(new Set(places).size).toBeGreaterThan(1);
  });

  it('gives the same answer for the same text', async () => {
    expect(await ai.makeQuiz({ text: LESSON })).toEqual(await ai.makeQuiz({ text: LESSON }));
    expect(await ai.makeSummary({ text: LESSON })).toEqual(await ai.makeSummary({ text: LESSON }));
  });

  it('works for Cyrillic text', async () => {
    const text =
      'Фотосинтеза је процес у којем биљке праве храну уз помоћ светлости. ' +
      'За то користе воду из земљишта и угљен-диоксид из ваздуха. ' +
      'Процес се одвија у зеленим деловима биљке, највише у лишћу. ' +
      'Зелена боја потиче од хлорофила који хвата светлосну енергију. ' +
      'Током фотосинтезе настаје глукоза, врста шећера која биљци служи као храна.';

    expect(validateQuiz(await ai.makeQuiz({ text })).questions.length).toBeGreaterThan(0);
    expect(validateSummary(await ai.makeSummary({ text })).points.length).toBeGreaterThan(0);
  });

  it('cannot make a quiz from a text that is too short', async () => {
    await expect(ai.makeQuiz({ text: 'Biljke prave hranu uz pomoć svjetlosti.' })).rejects.toThrow(
      /too short/,
    );
  });

  it('breaks on purpose when the lesson contains the failure marker', async () => {
    const text = `${LESSON} ${FAIL_MARKER}`;

    await expect(ai.makeSummary({ text })).rejects.toThrow(/simulated/);
    await expect(ai.makeQuiz({ text })).rejects.toThrow(/simulated/);
  });

  it('answers in an unusable form on purpose when the lesson contains the bad output marker', async () => {
    const text = `${LESSON} ${BAD_OUTPUT_MARKER}`;

    expect(rejection(() => validateSummary({ points: [] }))).toBeInstanceOf(ContentError);
    expect(() => validateSummary(undefined)).toThrow(ContentError);
    await ai.makeSummary({ text }).then((summary) => {
      expect(() => validateSummary(summary)).toThrow(ContentError);
    });
    await ai.makeQuiz({ text }).then((quiz) => {
      expect(() => validateQuiz(quiz)).toThrow(ContentError);
    });
  });
});

describe('createAiProvider', () => {
  it.each(AI_PROVIDERS)('makes the provider "%s"', (name) => {
    expect(createAiProvider(name).name).toBe(name);
  });
});

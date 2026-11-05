import { describe, expect, it } from 'vitest';
import { quizOf } from '@/test/lessonApiFixtures';
import {
  NO_ANSWER,
  formToRequest,
  newQuestion,
  quizSchema,
  quizToForm,
  type QuizFormInput,
  type QuestionFormValues,
} from './quizForm';

function choice(overrides: Partial<QuestionFormValues> = {}): QuestionFormValues {
  return {
    ...newQuestion('choice'),
    prompt: 'Šta je fotosinteza?',
    options: [{ text: 'Hrana' }, { text: 'Voda' }, { text: 'Zrak' }],
    correct: 0,
    ...overrides,
  };
}

const check = (questions: QuestionFormValues[]) => quizSchema.safeParse({ questions });
const messages = (questions: QuestionFormValues[]) => {
  const result = check(questions);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('quizToForm', () => {
  it('turns the quiz of the server into the form, with the right answer as an index', () => {
    const form = quizToForm(quizOf());

    expect(form.questions).toEqual([
      {
        kind: 'choice',
        prompt: 'Šta biljke prave uz svjetlost?',
        explanation: 'Biljke prave hranu uz pomoć svjetlosti.',
        options: [{ text: 'Hranu' }, { text: 'Vodu' }, { text: 'Kamen' }],
        correct: 0,
      },
      {
        kind: 'true_false',
        prompt: 'Biljke diše kroz lišće.',
        explanation: '',
        options: [{ text: 'Tačno' }, { text: 'Netačno' }],
        correct: 0,
      },
    ]);
  });

  it('puts questions and answers in the order of their position', () => {
    const quiz = quizOf();
    quiz.questions.reverse();
    quiz.questions[1]!.options.reverse();

    const form = quizToForm(quiz);

    expect(form.questions.map((question) => question.prompt)).toEqual([
      'Šta biljke prave uz svjetlost?',
      'Biljke diše kroz lišće.',
    ]);
    expect(form.questions[0]!.options.map((option) => option.text)).toEqual([
      'Hranu',
      'Vodu',
      'Kamen',
    ]);
  });

  it('starts a new quiz with one empty question of three answers', () => {
    const form = quizToForm(null) as { questions: QuestionFormValues[] };
    expect(form.questions).toHaveLength(1);
    expect(form.questions[0]!.options).toHaveLength(3);
    expect(form.questions[0]!.correct).toBe(NO_ANSWER);
  });
});

describe('formToRequest', () => {
  it('sends every question with the right answer marked, and leaves out an empty explanation', () => {
    const request = formToRequest({
      questions: [
        choice({ explanation: 'Zato.', correct: 2 }),
        { ...newQuestion('true_false'), prompt: 'Jeste li sigurni?', correct: 1 },
      ],
    });

    expect(request).toEqual([
      {
        kind: 'choice',
        prompt: 'Šta je fotosinteza?',
        explanation: 'Zato.',
        options: [
          { text: 'Hrana', isCorrect: false },
          { text: 'Voda', isCorrect: false },
          { text: 'Zrak', isCorrect: true },
        ],
      },
      {
        kind: 'true_false',
        prompt: 'Jeste li sigurni?',
        options: [
          { text: 'Tačno', isCorrect: false },
          { text: 'Netačno', isCorrect: true },
        ],
      },
    ]);
  });
});

describe('the rules of the quiz', () => {
  it('accepts a complete choice question and a complete true/false question', () => {
    expect(
      check([choice(), { ...newQuestion('true_false'), prompt: 'Da?', correct: 0 }]).success,
    ).toBe(true);
  });

  it('accepts three or four answers, and nothing else', () => {
    expect(
      check([choice({ options: [{ text: 'A' }, { text: 'B' }, { text: 'C' }, { text: 'D' }] })])
        .success,
    ).toBe(true);
    expect(messages([choice({ options: [{ text: 'A' }, { text: 'B' }] })])).toContain(
      'Pitanje sa izborom ima 3 ili 4 odgovora.',
    );
    expect(
      messages([choice({ options: ['A', 'B', 'C', 'D', 'E'].map((text) => ({ text })) })]),
    ).toContain('Pitanje sa izborom ima 3 ili 4 odgovora.');
  });

  it('wants the question, every answer and a marked right answer', () => {
    expect(messages([choice({ prompt: '   ' })])).toContain('Napiši pitanje.');
    expect(
      messages([choice({ options: [{ text: 'A' }, { text: ' ' }, { text: 'C' }] })]),
    ).toContain('Napiši odgovor ili ga ukloni.');
    expect(messages([choice({ correct: NO_ANSWER })])).toContain('Označi tačan odgovor.');
    expect(messages([choice({ correct: 3 })])).toContain('Označi tačan odgovor.');
  });

  it('wants different answers, whatever the letter case', () => {
    expect(
      messages([choice({ options: [{ text: 'Hrana' }, { text: ' hrana ' }, { text: 'Voda' }] })]),
    ).toContain('Odgovori moraju biti različiti.');
  });

  it('points at the answer that repeats, not at the first one', () => {
    const result = check([
      choice({ options: [{ text: 'Hrana' }, { text: 'Voda' }, { text: 'hrana' }] }),
    ]);
    expect(result.success).toBe(false);
    const issue =
      !result.success && result.error.issues.find((i) => i.message.includes('različiti'));
    expect(issue && issue.path).toEqual(['questions', 0, 'options', 2, 'text']);
  });

  it('has limits on the length of every text', () => {
    expect(messages([choice({ prompt: 'x'.repeat(501) })])).toContain(
      'Pitanje može imati najviše 500 znakova.',
    );
    expect(
      messages([choice({ options: [{ text: 'x'.repeat(301) }, { text: 'B' }, { text: 'C' }] })]),
    ).toContain('Odgovor može imati najviše 300 znakova.');
    expect(messages([choice({ explanation: 'x'.repeat(501) })])).toContain(
      'Objašnjenje može imati najviše 500 znakova.',
    );
  });

  it('wants between 1 and 20 questions', () => {
    expect(messages([])).toContain('Kviz mora imati bar jedno pitanje.');
    expect(check(Array.from({ length: 20 }, () => choice())).success).toBe(true);
    expect(messages(Array.from({ length: 21 }, () => choice()))).toContain(
      'Kviz može imati najviše 20 pitanja.',
    );
  });

  it('does not ask for a text of the two answers of a true/false question', () => {
    const question: QuizFormInput['questions'][number] = {
      ...newQuestion('true_false'),
      prompt: 'Da?',
      correct: 1,
    };
    expect(check([question as QuestionFormValues]).success).toBe(true);
  });
});

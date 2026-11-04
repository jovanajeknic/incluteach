import type { QuestionContent, QuestionKind, QuizContent, SummaryContent } from './types.ts';

export const CONTENT_LIMITS = {
  maxPoints: 30,
  maxPointLength: 300,
  maxQuestions: 20,
  maxPromptLength: 500,
  maxOptionLength: 300,
  maxExplanationLength: 500,
} as const;

export const TRUE_TEXT = 'Tačno';
export const FALSE_TEXT = 'Netačno';

// The content is not usable. The message says what is wrong, in words for a developer or a
// teacher; it is never shown with details of the AI service.
export class ContentError extends Error {}

// Text on one line, without surrounding spaces and without the character PostgreSQL cannot store.
function line(value: unknown, what: string, max: number, { allowEmpty = false } = {}): string {
  if (typeof value !== 'string') {
    throw new ContentError(`${what} must be text.`);
  }
  const text = value.replaceAll(String.fromCharCode(0), '').replace(/\s+/g, ' ').trim();
  if (text === '' && !allowEmpty) {
    throw new ContentError(`${what} must not be empty.`);
  }
  if (text.length > max) {
    throw new ContentError(`${what} is longer than ${max} characters.`);
  }
  return text;
}

// Checks (and tidies) a summary, whether it comes from an AI service or from a teacher.
export function validateSummary(value: unknown): SummaryContent {
  const points = (value as { points?: unknown } | null)?.points;
  if (!Array.isArray(points) || points.length === 0) {
    throw new ContentError('A summary needs at least one point.');
  }
  if (points.length > CONTENT_LIMITS.maxPoints) {
    throw new ContentError(`A summary can have at most ${CONTENT_LIMITS.maxPoints} points.`);
  }
  return {
    points: points.map((point, index) =>
      line(point, `Point ${index + 1}`, CONTENT_LIMITS.maxPointLength),
    ),
  };
}

function validateQuestion(value: unknown, index: number): QuestionContent {
  const label = `Question ${index + 1}`;
  const question = value as {
    kind?: unknown;
    prompt?: unknown;
    explanation?: unknown;
    options?: unknown;
  } | null;

  if (question?.kind !== 'choice' && question?.kind !== 'true_false') {
    throw new ContentError(`${label} must be a choice or a true/false question.`);
  }
  const kind: QuestionKind = question.kind;
  const prompt = line(question.prompt, `${label}: the question`, CONTENT_LIMITS.maxPromptLength);
  const explanation =
    question.explanation === undefined || question.explanation === null
      ? null
      : line(
          question.explanation,
          `${label}: the explanation`,
          CONTENT_LIMITS.maxExplanationLength,
          {
            allowEmpty: true,
          },
        ) || null;

  if (!Array.isArray(question.options)) {
    throw new ContentError(`${label} needs answers.`);
  }
  const options = question.options.map((option: unknown, optionIndex: number) => {
    const given = option as { text?: unknown; isCorrect?: unknown } | null;
    if (typeof given?.isCorrect !== 'boolean') {
      throw new ContentError(`${label}: answer ${optionIndex + 1} must say if it is right.`);
    }
    return {
      text: line(given.text, `${label}: answer ${optionIndex + 1}`, CONTENT_LIMITS.maxOptionLength),
      isCorrect: given.isCorrect,
    };
  });

  if (options.filter((option) => option.isCorrect).length !== 1) {
    throw new ContentError(`${label} needs exactly one right answer.`);
  }

  if (kind === 'choice') {
    if (options.length < 3 || options.length > 4) {
      throw new ContentError(`${label} needs 3 or 4 answers to choose from.`);
    }
    const distinct = new Set(options.map((option) => option.text.toLowerCase()));
    if (distinct.size !== options.length) {
      throw new ContentError(`${label} has two answers that are the same.`);
    }
    return { kind, prompt, explanation, options };
  }

  // A true/false question always has the same two answers, in the same order.
  const texts = options.map((option) => option.text.toLowerCase()).sort();
  if (
    options.length !== 2 ||
    texts[0] !== FALSE_TEXT.toLowerCase() ||
    texts[1] !== TRUE_TEXT.toLowerCase()
  ) {
    throw new ContentError(`${label} must have the answers "${TRUE_TEXT}" and "${FALSE_TEXT}".`);
  }
  const trueIsRight =
    options.find((option) => option.isCorrect)?.text.toLowerCase() === TRUE_TEXT.toLowerCase();
  return {
    kind,
    prompt,
    explanation,
    options: [
      { text: TRUE_TEXT, isCorrect: trueIsRight },
      { text: FALSE_TEXT, isCorrect: !trueIsRight },
    ],
  };
}

// Checks (and tidies) a quiz, whether it comes from an AI service or from a teacher.
export function validateQuiz(value: unknown): QuizContent {
  const questions = (value as { questions?: unknown } | null)?.questions;
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new ContentError('A quiz needs at least one question.');
  }
  if (questions.length > CONTENT_LIMITS.maxQuestions) {
    throw new ContentError(`A quiz can have at most ${CONTENT_LIMITS.maxQuestions} questions.`);
  }
  return { questions: questions.map(validateQuestion) };
}

import {
  AiUserError,
  type AiProvider,
  type QuestionContent,
  type QuizContent,
  type SummaryContent,
} from './types.ts';

// A stand-in for a real AI service, used until one is chosen. It understands nothing: it picks
// sentences of the lesson for the summary and builds questions by blanking out a word of a
// sentence or by swapping a word for another one from the same text. The results are always
// complete and in the right form, so the rest of the system can be built and tested for free,
// and nothing leaves this computer.
//
// Two markers let a developer test what happens when the AI misbehaves:
//   [[ai-fail]]        in the lesson text: the AI "breaks" with an error;
//   [[ai-bad-output]]  in the lesson text: the AI answers in a form that cannot be used.
export const FAIL_MARKER = '[[ai-fail]]';
export const BAD_OUTPUT_MARKER = '[[ai-bad-output]]';

const MIN_SENTENCE_LENGTH = 20;
// A longer sentence does not fit in a question.
const MAX_SENTENCE_LENGTH = 400;
const MIN_WORD_LENGTH = 5;

function sentencesOf(text: string): string[] {
  return text
    .split(/\n+|(?<=[.!?…])\s+/u)
    .map((sentence) => sentence.replace(/\s+/g, ' ').trim())
    .filter((sentence) => sentence.length >= MIN_SENTENCE_LENGTH);
}

const wordsOf = (sentence: string): string[] =>
  sentence.match(new RegExp(`\\p{L}{${MIN_WORD_LENGTH},}`, 'gu')) ?? [];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// `count` positions spread evenly over `length` items.
function spread(count: number, length: number): number[] {
  return Array.from({ length: count }, (_, index) => Math.floor((index * length) / count));
}

function shorten(sentence: string, max = 200): string {
  if (sentence.length <= max) {
    return sentence;
  }
  const cut = sentence.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : cut.length)}…`;
}

const matchCase = (like: string, word: string) =>
  like[0] === like[0].toUpperCase() && like[0] !== like[0].toLowerCase()
    ? word[0].toUpperCase() + word.slice(1)
    : word;

function makeSummary(text: string): SummaryContent {
  const sentences = sentencesOf(text);
  if (sentences.length === 0) {
    const whole = text.replace(/\s+/g, ' ').trim();
    if (whole === '') {
      throw new AiUserError('There is no text to summarize.');
    }
    return { points: [shorten(whole)] };
  }

  const count =
    sentences.length <= 3 ? sentences.length : clamp(Math.round(sentences.length / 3), 3, 10);
  return {
    points: spread(count, sentences.length).map((index) => shorten(sentences[index])),
  };
}

function makeQuiz(text: string): QuizContent {
  const candidates = sentencesOf(text).filter(
    (sentence) => sentence.length <= MAX_SENTENCE_LENGTH && wordsOf(sentence).length > 0,
  );
  const vocabulary = [...new Set(wordsOf(text).map((word) => word.toLowerCase()))];

  const wanted = clamp(Math.round(text.length / 700), 5, 10);
  const chosen = spread(Math.min(wanted, candidates.length), candidates.length).map(
    (index) => candidates[index],
  );

  const questions: QuestionContent[] = [];
  for (const sentence of chosen) {
    const sentenceWords = new Set(wordsOf(sentence).map((word) => word.toLowerCase()));
    const target = wordsOf(sentence).reduce((longest, word) =>
      word.length > longest.length ? word : longest,
    );
    // Words of the same lesson that are not in this sentence, the closest in length first.
    const others = vocabulary
      .filter((word) => !sentenceWords.has(word))
      .sort(
        (a, b) =>
          Math.abs(a.length - target.length) - Math.abs(b.length - target.length) ||
          a.localeCompare(b),
      )
      .map((word) => matchCase(target, word));
    if (others.length < 2) {
      continue;
    }

    const explanation = shorten(`Iz lekcije: ${sentence}`, 480);
    // Choice, true, choice, false, and again.
    const turn = questions.length % 4;

    if (turn === 1) {
      questions.push({
        kind: 'true_false',
        prompt: sentence,
        explanation,
        options: [
          { text: 'Tačno', isCorrect: true },
          { text: 'Netačno', isCorrect: false },
        ],
      });
    } else if (turn === 3) {
      questions.push({
        kind: 'true_false',
        prompt: sentence.replace(target, others[0]),
        explanation,
        options: [
          { text: 'Tačno', isCorrect: false },
          { text: 'Netačno', isCorrect: true },
        ],
      });
    } else {
      const wrong = others.slice(0, Math.min(3, others.length));
      const options = wrong.map((word) => ({ text: word, isCorrect: false }));
      // The right answer moves around, so it is not always in the same place.
      options.splice(questions.length % (options.length + 1), 0, { text: target, isCorrect: true });
      questions.push({
        kind: 'choice',
        prompt: sentence.replace(target, '_____'),
        explanation,
        options,
      });
    }
  }

  if (questions.length === 0) {
    throw new AiUserError('The text is too short to make a quiz.');
  }
  return { questions };
}

export function createFakeAi({ delayMs = 0 }: { delayMs?: number } = {}): AiProvider {
  const wait = () =>
    delayMs > 0 ? new Promise((resolve) => setTimeout(resolve, delayMs)) : undefined;

  const guard = (text: string): 'bad' | null => {
    if (text.includes(FAIL_MARKER)) {
      throw new Error('The AI service broke (simulated).');
    }
    return text.includes(BAD_OUTPUT_MARKER) ? 'bad' : null;
  };

  return {
    name: 'fake',
    async makeSummary({ text }) {
      await wait();
      return guard(text) === 'bad' ? { points: [] } : makeSummary(text);
    },
    async makeQuiz({ text }) {
      await wait();
      return guard(text) === 'bad' ? { questions: 'not a list' } : makeQuiz(text);
    },
  };
}

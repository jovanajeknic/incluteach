import { z } from 'zod';
import { text } from '@/text/sr-Latn';
import type { Quiz, QuizQuestionInput } from '../api/lessonsApi';
import {
  QUIZ_EXPLANATION_MAX_LENGTH,
  QUIZ_MAX_QUESTIONS,
  QUIZ_OPTION_MAX_LENGTH,
  QUIZ_PROMPT_MAX_LENGTH,
} from '../api/lessonsApi';

const t = text.teacher.review.quiz.errors;

/** The two answers of a true/false question, in the one order the server keeps them. */
export const TRUE_FALSE_ANSWERS = ['Tačno', 'Netačno'] as const;
export const CHOICE_MIN_OPTIONS = 3;
export const CHOICE_MAX_OPTIONS = 4;
/** "No answer is marked as right yet". */
export const NO_ANSWER = -1;

const question = z
  .object({
    kind: z.enum(['choice', 'true_false']),
    prompt: z.string().trim().min(1, t.promptRequired).max(QUIZ_PROMPT_MAX_LENGTH, t.promptTooLong),
    explanation: z.string().trim().max(QUIZ_EXPLANATION_MAX_LENGTH, t.explanationTooLong),
    options: z.array(
      z.object({
        text: z.string().trim().max(QUIZ_OPTION_MAX_LENGTH, t.optionTooLong),
      }),
    ),
    /** The index of the right answer in `options`, or NO_ANSWER. */
    correct: z.number(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === 'choice') {
      value.options.forEach((option, index) => {
        if (option.text.length === 0) {
          ctx.addIssue({
            code: 'custom',
            path: ['options', index, 'text'],
            message: t.optionRequired,
          });
        }
      });
      // Every answer must differ from the others, whatever the letter case.
      const seen = new Set<string>();
      value.options.forEach((option, index) => {
        const key = option.text.toLowerCase();
        if (key.length > 0 && seen.has(key)) {
          ctx.addIssue({
            code: 'custom',
            path: ['options', index, 'text'],
            message: t.optionsDiffer,
          });
        }
        seen.add(key);
      });
      if (value.options.length < CHOICE_MIN_OPTIONS || value.options.length > CHOICE_MAX_OPTIONS) {
        ctx.addIssue({ code: 'custom', path: ['options'], message: t.optionCount });
      }
    }
    if (value.correct < 0 || value.correct >= value.options.length) {
      ctx.addIssue({ code: 'custom', path: ['correct'], message: t.correctRequired });
    }
  });

export const quizSchema = z.object({
  questions: z.array(question).min(1, t.noQuestions).max(QUIZ_MAX_QUESTIONS, t.tooMany),
});

export type QuizFormInput = z.input<typeof quizSchema>;
export type QuizFormValues = z.output<typeof quizSchema>;
export type QuestionFormValues = QuizFormValues['questions'][number];

/** An empty question of the kind the teacher asked to add. */
export function newQuestion(kind: QuestionFormValues['kind']): QuestionFormValues {
  return {
    kind,
    prompt: '',
    explanation: '',
    options:
      kind === 'true_false'
        ? TRUE_FALSE_ANSWERS.map((answer) => ({ text: answer }))
        : Array.from({ length: CHOICE_MIN_OPTIONS }, () => ({ text: '' })),
    correct: NO_ANSWER,
  };
}

/** The quiz as the server keeps it, in the shape of the form. */
export function quizToForm(quiz: Quiz | null): QuizFormInput {
  if (!quiz) return { questions: [newQuestion('choice')] };
  return {
    questions: [...quiz.questions]
      .sort((a, b) => a.position - b.position)
      .map((item) => {
        const options = [...item.options].sort((a, b) => a.position - b.position);
        return {
          kind: item.kind,
          prompt: item.prompt,
          explanation: item.explanation ?? '',
          options: options.map((option) => ({ text: option.text })),
          correct: options.findIndex((option) => option.isCorrect),
        };
      }),
  };
}

/** The form as `PUT /lessons/{id}/quiz` wants it: all the questions, as they should be. */
export function formToRequest(values: QuizFormValues): QuizQuestionInput[] {
  return values.questions.map((item) => ({
    kind: item.kind,
    prompt: item.prompt,
    // An empty explanation is simply left out.
    ...(item.explanation ? { explanation: item.explanation } : {}),
    options: item.options.map((option, index) => ({
      text: option.text,
      isCorrect: index === item.correct,
    })),
  }));
}

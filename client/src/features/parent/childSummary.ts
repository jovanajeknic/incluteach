import type { QuizQuestion, StudentLesson } from '@/features/student/types';
import { text } from '@/text/sr-Latn';
import type { ChildData } from './types';

export interface QuestionToRepeat {
  lesson: StudentLesson;
  question: QuizQuestion;
}

/** Counts a parent sees for one child; no scores, only what was done and what to revisit. */
export function childSummary(child: ChildData) {
  const total = child.lessons.length;
  const done = child.lessons.filter((lesson) => child.progressOf(lesson.id) === 'completed').length;
  const quizzes = child.lessons.filter((lesson) => child.practiceOf(lesson.id)).length;
  const toRepeat: QuestionToRepeat[] = child.lessons.flatMap((lesson) => {
    const missed = child.practiceOf(lesson.id)?.difficultQuestionIds ?? [];
    return lesson.quiz
      .filter((question) => missed.includes(question.id))
      .map((question) => ({ lesson, question }));
  });
  return { total, done, quizzes, toRepeat };
}

/** Each child keeps the same soft colour everywhere, so siblings are easy to tell apart. */
export const childTones = [
  'bg-sky text-sky-ink',
  'bg-blush text-blush-ink',
  'bg-pistachio text-pistachio-ink',
];

/** Labels for the parent's view, which uses the version names parents agreed to. */
export const parentVersionLabels = {
  reading: {
    standard: text.parent.lesson.versionNames.standard,
    shortened: text.parent.lesson.versionNames.shortened,
    easier: text.parent.lesson.versionNames.easier,
    dyslexia: text.parent.lesson.versionNames.dyslexia,
  },
  audio: { yes: text.parent.child.audioYes, no: text.parent.child.audioNo },
};

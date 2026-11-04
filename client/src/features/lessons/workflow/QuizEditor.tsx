import { useState } from 'react';
import { useSchool } from '@/features/school/schoolContext';
import type { SchoolLesson } from '@/features/school/types';
import type { QuizQuestion } from '@/features/student/types';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { text } from '@/text/sr-Latn';
import { blankInputClassName, SectionCard, StatusMessage } from './SectionCard';

const OPTION_LETTERS = ['a', 'b', 'c', 'd', 'e'];

let questionCounter = 0;
function newQuestion(): QuizQuestion {
  questionCounter += 1;
  return {
    id: `q-new-${Date.now()}-${questionCounter}`,
    question: '',
    options: ['', '', ''],
    correctIndex: 0,
    explanation: '',
  };
}

function isComplete(question: QuizQuestion): boolean {
  return (
    question.question.trim() !== '' &&
    question.options.every((option) => option.trim() !== '') &&
    question.explanation.trim() !== '' &&
    question.correctIndex >= 0 &&
    question.correctIndex < question.options.length
  );
}

/** Practice questions written like a test sheet: numbered, with a), b), c) answers. */
export function QuizEditor({ lesson }: { lesson: SchoolLesson }) {
  const t = text.lessonDetail.quiz;
  const { updateLesson } = useSchool();
  const [questions, setQuestions] = useState<QuizQuestion[]>(lesson.quiz);
  const [message, setMessage] = useState<{ text: string; tone: 'success' | 'error' }>();

  function change(index: number, update: Partial<QuizQuestion>) {
    setQuestions((current) => current.map((q, i) => (i === index ? { ...q, ...update } : q)));
    setMessage(undefined);
  }

  function save() {
    if (!questions.every(isComplete)) {
      setMessage({ text: text.lessonDetail.sectionInvalid, tone: 'error' });
      return;
    }
    updateLesson(lesson.id, {
      quiz: questions.map((q) => ({
        ...q,
        question: q.question.trim(),
        options: q.options.map((option) => option.trim()),
        explanation: q.explanation.trim(),
      })),
    });
    setMessage({ text: text.lessonDetail.sectionSaved, tone: 'success' });
  }

  return (
    <SectionCard id="quiz-heading" title={t.heading} intro={t.intro}>
      {questions.length === 0 ? (
        <p className="hand-note text-ink-soft">{t.empty}</p>
      ) : (
        <ol className="grid gap-8">
          {questions.map((question, index) => {
            const number = index + 1;
            return (
              <li key={question.id} className="grid grid-cols-[1.75rem_1fr] gap-x-2">
                <span
                  aria-hidden="true"
                  className="pt-2 font-display text-lg font-bold text-ink-soft"
                >
                  {number}.
                </span>
                <div>
                  <Input
                    aria-label={t.question(number)}
                    value={question.question}
                    onChange={(event) => change(index, { question: event.target.value })}
                    className={`${blankInputClassName} font-display font-medium`}
                  />

                  <fieldset className="mt-3">
                    <legend className="sr-only">{t.correct(number)}</legend>
                    <div className="grid gap-2">
                      {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${question.id}`}
                            checked={question.correctIndex === optionIndex}
                            onChange={() => change(index, { correctIndex: optionIndex })}
                            aria-label={t.correctOption(optionIndex + 1)}
                            className="size-4 shrink-0 accent-forest"
                          />
                          <span aria-hidden="true" className="w-4 text-ink-soft">
                            {OPTION_LETTERS[optionIndex]})
                          </span>
                          <Input
                            aria-label={t.option(number, optionIndex + 1)}
                            value={option}
                            onChange={(event) =>
                              change(index, {
                                options: question.options.map((value, i) =>
                                  i === optionIndex ? event.target.value : value,
                                ),
                              })
                            }
                            className={blankInputClassName}
                          />
                        </div>
                      ))}
                    </div>
                  </fieldset>

                  <Input
                    aria-label={t.explanation(number)}
                    placeholder={t.explanation(number)}
                    value={question.explanation}
                    onChange={(event) => change(index, { explanation: event.target.value })}
                    className={`${blankInputClassName} mt-3 italic`}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setQuestions((current) => current.filter((_, i) => i !== index));
                      setMessage(undefined);
                    }}
                    className="mt-2 rounded-sm text-sm text-blush-ink underline underline-offset-4 hover:text-ink"
                  >
                    {t.removeQuestion(number)}
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => setQuestions((current) => [...current, newQuestion()])}
          className="rounded-sm font-medium text-forest underline underline-offset-4 hover:text-forest-deep"
        >
          {t.addQuestion}
        </button>
        <Button type="button" variant="outline" onClick={save} className="h-9 px-4">
          {text.lessonDetail.saveSection}
        </Button>
      </div>
      <StatusMessage message={message?.text} tone={message?.tone} />
    </SectionCard>
  );
}

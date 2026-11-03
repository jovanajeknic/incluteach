import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useSchool } from '@/features/school/schoolContext';
import type { SchoolLesson } from '@/features/school/types';
import type { QuizQuestion } from '@/features/student/types';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { text } from '@/text/sr-Latn';
import { SectionCard, StatusMessage } from './SectionCard';

const fieldClassName = 'h-11 bg-card text-base md:text-base';

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

/** Practice questions with one correct answer and an explanation (practice has no score). */
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
        <p className="text-ink-soft">{t.empty}</p>
      ) : (
        <ol className="grid gap-5">
          {questions.map((question, index) => {
            const number = index + 1;
            return (
              <li key={question.id} className="rounded-2xl bg-paper p-4">
                <label className="flex flex-col gap-1 text-sm font-medium text-ink">
                  {t.question(number)}
                  <Input
                    value={question.question}
                    onChange={(event) => change(index, { question: event.target.value })}
                    className={fieldClassName}
                  />
                </label>

                <fieldset className="mt-3">
                  <legend className="text-sm font-medium text-ink">{t.correct(number)}</legend>
                  <div className="mt-2 grid gap-2">
                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center gap-3">
                        <input
                          type="radio"
                          name={`correct-${question.id}`}
                          checked={question.correctIndex === optionIndex}
                          onChange={() => change(index, { correctIndex: optionIndex })}
                          aria-label={t.correctOption(optionIndex + 1)}
                          className="size-4 shrink-0 accent-forest"
                        />
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
                          className={fieldClassName}
                        />
                      </div>
                    ))}
                  </div>
                </fieldset>

                <label className="mt-3 flex flex-col gap-1 text-sm font-medium text-ink">
                  {t.explanation(number)}
                  <Input
                    value={question.explanation}
                    onChange={(event) => change(index, { explanation: event.target.value })}
                    className={fieldClassName}
                  />
                </label>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setQuestions((current) => current.filter((_, i) => i !== index));
                    setMessage(undefined);
                  }}
                  className="mt-3 h-10 px-4"
                >
                  <Trash2 aria-hidden="true" />
                  {t.removeQuestion(number)}
                </Button>
              </li>
            );
          })}
        </ol>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setQuestions((current) => [...current, newQuestion()])}
          className="h-10 px-4"
        >
          <Plus aria-hidden="true" />
          {t.addQuestion}
        </Button>
        <Button type="button" onClick={save} className="h-10 px-4">
          {text.lessonDetail.saveSection}
        </Button>
      </div>
      <StatusMessage message={message?.text} tone={message?.tone} />
    </SectionCard>
  );
}

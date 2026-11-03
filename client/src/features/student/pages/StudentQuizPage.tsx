import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw, Star, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { MessagePage } from '@/shared/components/MessagePage';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { useStudent } from '../data/studentContext';
import { studentHomePath, studentLessonPath } from '../paths';
import type { StudentLesson } from '../types';

export function StudentQuizPage() {
  const { lessonId = '' } = useParams();
  const { getLesson } = useStudent();
  const lesson = getLesson(lessonId);

  if (!lesson || lesson.quiz.length === 0) {
    const t = text.student.lesson;
    return (
      <>
        <title>{text.app.pageTitle(t.notFoundTitle)}</title>
        <MessagePage
          title={t.notFoundTitle}
          description={t.notFoundDescription}
          action={
            <Button asChild variant="outline" size="lg">
              <Link to={studentHomePath}>{text.student.subject.backToSubjects}</Link>
            </Button>
          }
        />
      </>
    );
  }

  return <Quiz key={lesson.id} lesson={lesson} />;
}

/**
 * Practice only: every answer gets immediate feedback with a short explanation,
 * and there is no score, so mistakes are part of learning rather than a grade.
 */
function Quiz({ lesson }: { lesson: StudentLesson }) {
  const t = text.student.quiz;
  const { markCompleted } = useStudent();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  // Questions missed on the first try; parents see them to know what to practise.
  const [difficult, setDifficult] = useState<string[]>([]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const question = lesson.quiz[index]!;
  const answered = selected !== null;
  const isLast = index === lesson.quiz.length - 1;
  const correct = selected === question.correctIndex;

  // Move focus to the new question so keyboard and screen reader users start at the top.
  useEffect(() => {
    if (index > 0) headingRef.current?.focus();
  }, [index]);

  // The answer buttons become disabled once answered, so focus moves on to "next".
  useEffect(() => {
    if (answered) nextRef.current?.focus();
  }, [answered]);

  function next() {
    if (isLast) {
      markCompleted(lesson.id, difficult);
      setFinished(true);
      return;
    }
    setIndex((current) => current + 1);
    setSelected(null);
  }

  function choose(optionIndex: number) {
    setSelected(optionIndex);
    if (optionIndex !== question.correctIndex) {
      setDifficult((current) => [...current, question.id]);
    }
  }

  function restart() {
    setIndex(0);
    setSelected(null);
    setFinished(false);
    setDifficult([]);
  }

  if (finished) {
    return (
      <>
        <title>{text.app.pageTitle(t.pageTitle(lesson.title))}</title>
        <div className="mx-auto max-w-xl rounded-[2rem] bg-butter p-8 text-center sm:p-12">
          <span
            aria-hidden="true"
            className="mx-auto flex size-20 items-center justify-center rounded-full bg-card shadow-soft"
          >
            <Star className="size-11 fill-butter-deep text-butter-ink" />
          </span>
          <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-ink">
            {t.doneTitle}
          </h1>
          <p className="mt-3 text-lg text-ink">{t.doneText}</p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="h-12 px-6 text-base">
              <Link to={studentHomePath}>{t.backToSubjects}</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={restart}
              className="h-12 px-6 text-base"
            >
              <RotateCcw aria-hidden="true" />
              {t.again}
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle(lesson.title))}</title>
      <Link
        to={studentLessonPath(lesson.id)}
        className="inline-flex items-center gap-2 rounded-full font-display font-medium text-forest hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-5" />
        {t.backToLesson}
      </Link>

      <div className="mx-auto mt-6 max-w-2xl">
        <p className="font-display text-sm font-medium text-ink-soft">
          {t.heading} · {lesson.title}
        </p>
        <p className="mt-1 text-ink-soft">{t.intro}</p>

        <div className="mt-6 rounded-[2rem] border border-border bg-card p-6 shadow-soft sm:p-8">
          <p className="font-display text-sm font-medium text-lilac-ink">
            {t.progress(index + 1, lesson.quiz.length)}
          </p>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="mt-2 font-display text-2xl font-bold text-ink focus:outline-none sm:text-3xl"
          >
            {question.question}
          </h1>

          <ul aria-label={t.answersLabel} className="mt-6 grid gap-3">
            {question.options.map((option, optionIndex) => {
              const isCorrectOption = optionIndex === question.correctIndex;
              const isSelected = optionIndex === selected;
              return (
                <li key={option}>
                  <button
                    type="button"
                    disabled={answered}
                    aria-pressed={isSelected}
                    onClick={() => choose(optionIndex)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-border bg-card px-5 py-4 text-left font-display text-lg text-ink transition-colors enabled:hover:border-forest/50 enabled:hover:bg-mint/40',
                      answered && isCorrectOption && 'border-forest bg-mint',
                      answered && isSelected && !isCorrectOption && 'border-blush-ink bg-blush',
                    )}
                  >
                    {option}
                    {answered && isCorrectOption && (
                      <CheckCircle2 aria-hidden="true" className="size-6 shrink-0 text-mint-ink" />
                    )}
                    {answered && isSelected && !isCorrectOption && (
                      <XCircle aria-hidden="true" className="size-6 shrink-0 text-blush-ink" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Always rendered so the feedback is announced when it appears. */}
          <div role="status" aria-live="polite" className="mt-6">
            {answered && (
              <div
                className={cn(
                  'rounded-2xl px-5 py-4',
                  correct ? 'bg-mint text-mint-ink' : 'bg-blush text-blush-ink',
                )}
              >
                <p className="font-display text-lg font-bold">
                  {correct ? t.correct : t.incorrect}
                </p>
                {!correct && (
                  <p className="mt-1 font-medium">
                    {t.correctAnswerIs(question.options[question.correctIndex] ?? '')}
                  </p>
                )}
                <p className="mt-1 text-ink">{question.explanation}</p>
              </div>
            )}
          </div>

          {answered && (
            <div className="mt-6 flex justify-end">
              <Button
                ref={nextRef}
                type="button"
                size="lg"
                onClick={next}
                className="h-12 px-6 text-base"
              >
                {isLast ? t.finish : t.next}
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

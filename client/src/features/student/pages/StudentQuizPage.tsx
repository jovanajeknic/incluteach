import {
  ArrowClockwiseIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  StarIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { MessagePage } from '@/shared/components/MessagePage';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { blobShape } from '@/shared/visual/subjectIcons';
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
  const { recordPractice } = useStudent();
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
      recordPractice(lesson.id, difficult);
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
        <div className="relative mx-auto max-w-xl overflow-hidden rounded-[2.25rem] bg-butter p-8 text-center sm:p-12">
          <span
            aria-hidden="true"
            className="absolute -top-16 -left-12 size-48 rounded-full bg-butter-deep opacity-40"
          />
          {/* Two small stars burst out once; with reduced motion they simply appear. */}
          {[-1, 1].map((side) => (
            <motion.span
              key={side}
              aria-hidden="true"
              initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
              animate={{ opacity: 1, x: side * 70, y: -30, scale: 1 }}
              transition={{ delay: 0.25, type: 'spring', stiffness: 160, damping: 12 }}
              className="absolute top-14 left-1/2 -ml-3"
            >
              <StarIcon weight="fill" className="size-6 text-blush-deep" />
            </motion.span>
          ))}
          <motion.span
            aria-hidden="true"
            initial={{ scale: 0.3, rotate: -40 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 11 }}
            className="relative mx-auto flex size-24 items-center justify-center rounded-full bg-card shadow-soft"
          >
            <StarIcon weight="fill" className="size-14 text-butter-deep" />
          </motion.span>
          <h1 className="relative mt-6 font-display text-3xl font-semibold tracking-tight text-ink">
            {t.doneTitle}
          </h1>
          <p className="relative mt-3 text-lg text-ink">{t.doneText}</p>
          <div className="relative mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
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
              <ArrowClockwiseIcon aria-hidden="true" weight="bold" />
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
        className="inline-flex items-center gap-1.5 rounded-full font-display font-medium text-ink-soft hover:text-forest"
      >
        <ArrowLeftIcon aria-hidden="true" weight="bold" className="size-4" />
        {t.backToLesson}
      </Link>

      <div className="mx-auto mt-6 max-w-2xl">
        <p className="font-display text-sm font-medium text-ink-soft">
          {t.heading} · {lesson.title}
        </p>
        <p className="mt-1 text-ink-soft">{t.intro}</p>

        <motion.div
          key={index}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: [0.2, 0.7, 0.3, 1] }}
          className="mt-6 rounded-[2rem] bg-card p-6 shadow-soft sm:p-8"
        >
          <p className="font-display text-sm font-medium text-lilac-ink">
            {t.progress(index + 1, lesson.quiz.length)}
          </p>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="mt-2 font-display text-2xl font-semibold text-ink focus:outline-none sm:text-3xl"
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
                      'flex w-full items-center gap-4 rounded-3xl border-2 border-border bg-paper px-4 py-3 text-left font-display text-lg text-ink transition-[background-color,border-color,transform] duration-200 enabled:hover:-translate-y-0.5 enabled:hover:border-forest/50 enabled:hover:bg-mint/40',
                      answered && isCorrectOption && 'border-forest bg-mint',
                      answered && isSelected && !isCorrectOption && 'border-blush-ink bg-blush',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center bg-card font-semibold text-forest',
                        blobShape,
                      )}
                    >
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    <span className="flex-1">{option}</span>
                    {answered && isCorrectOption && (
                      <CheckCircleIcon
                        aria-hidden="true"
                        weight="fill"
                        className="size-7 shrink-0 text-mint-ink"
                      />
                    )}
                    {answered && isSelected && !isCorrectOption && (
                      <XCircleIcon
                        aria-hidden="true"
                        weight="fill"
                        className="size-7 shrink-0 text-blush-ink"
                      />
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
                  'rounded-3xl px-5 py-4',
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
                <ArrowRightIcon aria-hidden="true" weight="bold" />
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}

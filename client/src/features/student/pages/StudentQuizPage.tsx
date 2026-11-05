import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ConfettiIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useSession } from '@/features/auth/api/session';
import {
  backgroundClass,
  readingTextClassName,
  type ReadingPreferences,
} from '@/features/reading-preferences/readingPreferences';
import { useReadingPreferences } from '@/features/reading-preferences/useReadingPreferences';
import { ApiError } from '@/shared/api/apiClient';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { MessagePage } from '@/shared/components/MessagePage';
import { formatClock, useSecondsLeft } from '@/shared/lib/useCountdown';
import { cn } from '@/shared/lib/utils';
import { cyrillicToLatin, displayInScript } from '@/shared/script/serbianScript';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { studentErrorMessage } from '../apiErrorMessage';
import {
  useAnswerQuestion,
  useCompleteLesson,
  useRefreshLesson,
  useStartTry,
  useStudentLesson,
} from '../api/queries';
import type { AnswerResult, AttemptQuestion, QuizTry, StudentLesson } from '../api/studentApi';
import { ListenControls } from '../audio/ListenControls';
import { useLessonSpeech } from '../audio/useLessonSpeech';
import { studentHomePath, studentLessonPath } from '../paths';

const t = text.pupil.quiz;

/** The quiz of a lesson: a practice, one question at a time, with an answer after each. */
export function StudentQuizPage() {
  const { lessonId = '' } = useParams();
  const lesson = useStudentLesson(lessonId);

  if (lesson.isPending) return <LoadingState label={text.pupil.load.loading} />;

  const missing =
    lesson.isError &&
    lesson.error instanceof ApiError &&
    (lesson.error.status === 404 || lesson.error.status === 403);
  if (lesson.isError && !missing) return <ErrorState onRetry={() => void lesson.refetch()} />;

  if (missing || !lesson.data?.quiz) {
    return (
      <>
        <title>{text.app.pageTitle(t.notFoundTitle)}</title>
        <MessagePage
          title={t.notFoundTitle}
          description={t.notFoundDescription}
          action={
            <Button asChild variant="outline" size="lg">
              <Link to={studentHomePath}>{text.pupil.subject.back}</Link>
            </Button>
          }
        />
      </>
    );
  }

  return <QuizRun key={lesson.data.id} lesson={lesson.data} />;
}

type Phase =
  | { kind: 'starting' }
  | { kind: 'waiting'; until: string }
  | { kind: 'running' }
  | { kind: 'changed' }
  | { kind: 'failed'; message: string };

/**
 * Starts the quiz (or goes on with an open try), walks through the questions and ends with
 * what the student can do next. There is no score anywhere: only right or not right, answer by
 * answer, with the explanation.
 */
function QuizRun({ lesson }: { lesson: StudentLesson }) {
  const { user } = useSession();
  const { preferences } = useReadingPreferences(user?.id ?? 'anonymous');
  const startTry = useStartTry(lesson.id);
  const [attempt, setAttempt] = useState<QuizTry | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'starting' });
  // The question whose answer is being looked at, until the student goes on.
  const [reviewing, setReviewing] = useState<string | null>(null);
  const begun = useRef(false);

  const begin = useCallback(async () => {
    setPhase({ kind: 'starting' });
    setAttempt(null);
    setReviewing(null);
    try {
      const { attempt: started } = await startTry.mutateAsync();
      setAttempt(started);
      setPhase({ kind: 'running' });
    } catch (error) {
      const until = error instanceof ApiError ? error.details?.nextAttemptAt : undefined;
      if (error instanceof ApiError && error.code === 'retry_later' && typeof until === 'string') {
        setPhase({ kind: 'waiting', until });
      } else {
        setPhase({ kind: 'failed', message: studentErrorMessage(error) });
      }
    }
  }, [startTry]);

  // Opening the page starts the try; a second visit goes on with the one that is still open.
  useEffect(() => {
    if (begun.current) return;
    begun.current = true;
    void begin();
  }, [begin]);

  function recordAnswer(result: AnswerResult) {
    setAttempt((current) =>
      current
        ? {
            ...current,
            status: result.attempt.status,
            allCorrect: result.attempt.allCorrect,
            questions: current.questions.map((question) =>
              question.id === result.answer.questionId
                ? { ...question, answer: result.answer }
                : question,
            ),
          }
        : current,
    );
    setReviewing(result.answer.questionId);
  }

  const questions = attempt?.questions ?? [];
  const current =
    questions.find((question) => question.id === reviewing) ??
    questions.find((question) => question.answer === null);

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle(lesson.title))}</title>
      <Link
        to={studentLessonPath(lesson.id)}
        className="inline-flex items-center gap-1.5 rounded-full font-display font-medium text-ink-soft hover:text-forest"
      >
        <ArrowLeftIcon aria-hidden="true" weight="bold" className="size-4" />
        {t.back}
      </Link>
      <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight text-ink">
        {t.heading}
      </h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{t.practice}</p>
      <p className="max-w-2xl text-sm text-ink-soft">{t.seenBy}</p>

      <div className="mt-6">
        {phase.kind === 'starting' && <LoadingState label={t.starting} />}

        {phase.kind === 'failed' && (
          <div role="alert" className="rounded-3xl bg-blush p-6 text-blush-ink">
            <p className="font-medium">{phase.message}</p>
            <Button type="button" className="mt-4" onClick={() => void begin()}>
              {text.pupil.load.retry}
            </Button>
          </div>
        )}

        {phase.kind === 'waiting' && (
          <WaitingNote lessonId={lesson.id} until={phase.until} onReady={() => void begin()} />
        )}

        {phase.kind === 'changed' && (
          <div role="alert" className="rounded-3xl bg-butter p-6 text-butter-ink">
            <h2 className="font-display text-2xl font-semibold">{t.changedTitle}</h2>
            <p className="mt-1">{t.changedText}</p>
            <Button type="button" className="mt-4" onClick={() => void begin()}>
              {t.restart}
            </Button>
          </div>
        )}

        {phase.kind === 'running' && attempt && current && (
          <QuestionView
            key={current.id}
            lessonId={lesson.id}
            attempt={attempt}
            question={current}
            number={questions.indexOf(current) + 1}
            total={questions.length}
            reviewing={reviewing === current.id}
            preferences={preferences}
            onAnswered={recordAnswer}
            onNext={() => setReviewing(null)}
            onChanged={() => setPhase({ kind: 'changed' })}
          />
        )}

        {phase.kind === 'running' && attempt && !current && (
          <TryDone lesson={lesson} attempt={attempt} onAgain={() => void begin()} />
        )}
      </div>
    </>
  );
}

interface QuestionViewProps {
  lessonId: string;
  attempt: QuizTry;
  question: AttemptQuestion;
  number: number;
  total: number;
  /** The answer was just given: show whether it was right and let the student go on. */
  reviewing: boolean;
  preferences: ReadingPreferences;
  onAnswered: (result: AnswerResult) => void;
  onNext: () => void;
  onChanged: () => void;
}

function QuestionView({
  lessonId,
  attempt,
  question,
  number,
  total,
  reviewing,
  preferences,
  onAnswered,
  onNext,
  onChanged,
}: QuestionViewProps) {
  const answerQuestion = useAnswerQuestion(lessonId, attempt.id);
  const [problem, setProblem] = useState<string | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const show = (value: string) => displayInScript(value, preferences.script);
  const given = question.answer;
  const isLast = number === total;

  // The voice reads the question and its answers, always in Latin script.
  const sentences = useMemo(
    () => [question.prompt, ...question.options.map((option) => option.text)].map(cyrillicToLatin),
    [question],
  );
  const speech = useLessonSpeech(sentences);

  // After an answer the next step is one key press away, and a screen reader hears the result.
  useEffect(() => {
    if (reviewing) nextRef.current?.focus();
  }, [reviewing]);

  async function choose(optionId: string) {
    setProblem(null);
    try {
      onAnswered(await answerQuestion.mutateAsync({ questionId: question.id, optionId }));
    } catch (error) {
      if (error instanceof ApiError && error.code === 'quiz_changed') {
        onChanged();
        return;
      }
      setProblem(studentErrorMessage(error));
    }
  }

  const correctText = given
    ? question.options.find((option) => option.id === given.correctOptionId)?.text
    : undefined;

  return (
    <section
      aria-labelledby="question-prompt"
      className={cn(
        'rounded-[2rem] px-6 py-8 shadow-soft sm:px-10 sm:py-10',
        backgroundClass[preferences.background],
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display font-medium text-ink-soft">{t.progress(number, total)}</p>
        <ListenControls
          listenLabel={text.pupil.audio.listenQuestion}
          availability={speech.availability}
          status={speech.status}
          rate={speech.rate}
          onRateChange={speech.setRate}
          onPlay={speech.play}
          onPause={speech.pause}
          onResume={speech.resume}
          onStop={speech.stop}
        />
      </div>

      <h2
        id="question-prompt"
        className={cn(
          'mt-5 font-display font-semibold text-ink',
          readingTextClassName(preferences),
        )}
      >
        {show(question.prompt)}
      </h2>

      <div role="group" aria-label={t.answersLabel} className="mt-6 grid gap-3">
        {question.options.map((option) => {
          const isRight = given !== null && option.id === given.correctOptionId;
          const isWrongChoice = given !== null && option.id === given.optionId && !given.correct;
          return (
            <button
              key={option.id}
              type="button"
              disabled={given !== null || answerQuestion.isPending}
              onClick={() => void choose(option.id)}
              className={cn(
                'flex items-center gap-3 rounded-2xl border-2 px-5 py-4 text-left text-ink transition-colors',
                readingTextClassName(preferences),
                given === null && 'border-border bg-card hover:border-forest/50',
                isRight && 'border-mint-ink bg-mint',
                isWrongChoice && 'border-blush-ink bg-blush',
                given !== null && !isRight && !isWrongChoice && 'border-border bg-card opacity-70',
              )}
            >
              {isRight && (
                <CheckCircleIcon
                  aria-hidden="true"
                  weight="fill"
                  className="size-6 shrink-0 text-mint-ink"
                />
              )}
              {isWrongChoice && (
                <XCircleIcon
                  aria-hidden="true"
                  weight="fill"
                  className="size-6 shrink-0 text-blush-ink"
                />
              )}
              <span>
                {show(option.text)}
                {isRight && <span className="sr-only"> ({t.rightMark})</span>}
                {isWrongChoice && <span className="sr-only"> ({t.yourMark})</span>}
              </span>
            </button>
          );
        })}
      </div>

      {/* Always rendered, so the result is announced as soon as it arrives. */}
      <div role="status" aria-live="polite" className="mt-6">
        {given && (
          <div
            className={cn(
              'rounded-2xl p-5',
              given.correct ? 'bg-mint text-mint-ink' : 'bg-butter text-butter-ink',
            )}
          >
            <p className="font-display text-xl font-semibold">
              {given.correct ? t.correct : t.incorrect}
            </p>
            {!given.correct && correctText && (
              <p className="mt-1 font-medium">{t.correctAnswerIs(show(correctText))}</p>
            )}
            {given.explanation && (
              <p className="mt-2">
                <span className="font-medium">{t.explanation}: </span>
                {show(given.explanation)}
              </p>
            )}
          </div>
        )}
      </div>
      {problem && (
        <p role="alert" className="mt-4 font-medium text-destructive">
          {problem}
        </p>
      )}

      {reviewing && (
        <div className="mt-6 flex justify-end">
          <Button ref={nextRef} type="button" size="lg" onClick={onNext} className="h-12 px-6">
            {isLast ? t.finish : t.next}
            <ArrowRightIcon aria-hidden="true" weight="bold" />
          </Button>
        </div>
      )}
    </section>
  );
}

/** What the student can do when every question was answered. */
function TryDone({
  lesson,
  attempt,
  onAgain,
}: {
  lesson: StudentLesson;
  attempt: QuizTry;
  onAgain: () => void;
}) {
  const refreshLesson = useRefreshLesson(lesson.id);
  const complete = useCompleteLesson(lesson.id);
  const [problem, setProblem] = useState<string | null>(null);

  // The wait before the next try, and whether the lesson can be finished, are known to the
  // server; ask the lesson again now that the try is over.
  useEffect(() => {
    void refreshLesson();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the try ends
  }, []);

  const finished = lesson.myProgress.completed;
  const allCorrect = attempt.allCorrect === true;

  async function finishLesson() {
    setProblem(null);
    try {
      await complete.mutateAsync();
    } catch (error) {
      setProblem(studentErrorMessage(error));
    }
  }

  if (allCorrect) {
    return (
      <div className="rounded-[2rem] bg-mint p-8 text-mint-ink">
        <ConfettiIcon aria-hidden="true" weight="duotone" className="size-10" />
        <h2 className="mt-3 font-display text-3xl font-semibold">
          {finished ? t.lessonFinished : t.allCorrectTitle}
        </h2>
        {!finished && <p className="mt-1 text-lg">{t.allCorrectText}</p>}
        <div role="status" aria-live="polite" className="empty:hidden">
          {problem && <p className="mt-3 font-medium text-destructive">{problem}</p>}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {!finished && (
            <Button
              type="button"
              size="lg"
              disabled={complete.isPending}
              onClick={() => void finishLesson()}
              className="h-12 px-6"
            >
              {complete.isPending ? t.finishing : t.finishLesson}
            </Button>
          )}
          <Button asChild variant="outline" size="lg" className="h-12 bg-card px-6">
            <Link to={studentLessonPath(lesson.id)}>{t.back}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] bg-butter p-8 text-butter-ink">
      <h2 className="font-display text-3xl font-semibold">{t.notAllTitle}</h2>
      <p className="mt-2 text-lg">{t.notAllText}</p>
      <Countdown until={lesson.myProgress.quiz?.nextAttemptAt} />
      <TryAgainRow
        lessonId={lesson.id}
        until={lesson.myProgress.quiz?.nextAttemptAt}
        onAgain={onAgain}
      />
    </div>
  );
}

/** The wait before a new try: nothing to press until the time has come. */
function WaitingNote({
  lessonId,
  until,
  onReady,
}: {
  lessonId: string;
  until: string;
  onReady: () => void;
}) {
  return (
    <div className="rounded-[2rem] bg-butter p-8 text-butter-ink">
      <h2 className="font-display text-3xl font-semibold">{t.waitTitle}</h2>
      <p className="mt-2 text-lg">{t.waitText}</p>
      <Countdown until={until} />
      <TryAgainRow lessonId={lessonId} until={until} onAgain={onReady} />
    </div>
  );
}

function Countdown({ until }: { until: string | null | undefined }) {
  const left = useSecondsLeft(until);
  if (left <= 0) return null;
  return (
    <p role="timer" className="mt-4 font-display text-2xl font-semibold">
      {t.waitCountdown(formatClock(left))}
    </p>
  );
}

function TryAgainRow({
  lessonId,
  until,
  onAgain,
}: {
  lessonId: string;
  until: string | null | undefined;
  onAgain: () => void;
}) {
  const left = useSecondsLeft(until);
  return (
    <div className="mt-5 flex flex-wrap gap-3">
      <Button asChild size="lg" className="h-12 px-6">
        <Link to={studentLessonPath(lessonId)}>{t.readAgain}</Link>
      </Button>
      <Button
        type="button"
        size="lg"
        variant="outline"
        disabled={left > 0}
        onClick={onAgain}
        className="h-12 bg-card px-6"
      >
        {t.tryAgain}
      </Button>
    </div>
  );
}

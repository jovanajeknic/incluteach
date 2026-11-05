import { ArrowLeftIcon, CheckCircleIcon, PuzzlePieceIcon, StarIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '@/shared/api/apiClient';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { MessagePage } from '@/shared/components/MessagePage';
import { formatDate } from '@/shared/lib/format';
import { formatClock, useSecondsLeft } from '@/shared/lib/useCountdown';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { useCompleteLesson, useStudentLesson } from '../api/queries';
import type { StudentLesson } from '../api/studentApi';
import { studentErrorMessage } from '../apiErrorMessage';
import { LessonReader } from '../components/LessonReader';
import { TryHistory } from '../components/TryHistory';
import { studentHomePath, studentQuizPath, subjectPath } from '../paths';

/** A published lesson: the text and the summary, shaped by the student's own settings. */
export function StudentLessonPage() {
  const t = text.pupil.lesson;
  const { lessonId = '' } = useParams();
  const lesson = useStudentLesson(lessonId);

  if (lesson.isPending) return <LoadingState label={text.pupil.load.loading} />;

  if (lesson.isError) {
    const missing =
      lesson.error instanceof ApiError &&
      (lesson.error.status === 404 || lesson.error.status === 403);
    if (!missing) return <ErrorState onRetry={() => void lesson.refetch()} />;
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

  // Keyed by lesson so the steps, the voice and the open panel start fresh for each lesson.
  return <LessonView key={lesson.data.id} lesson={lesson.data} />;
}

function LessonView({ lesson }: { lesson: StudentLesson }) {
  return (
    <LessonReader
      lesson={lesson}
      back={
        <Link
          to={subjectPath(lesson.subject.id)}
          className="inline-flex items-center gap-1.5 rounded-full font-display font-medium text-ink-soft hover:text-forest print:hidden"
        >
          <ArrowLeftIcon aria-hidden="true" weight="bold" className="size-4" />
          {text.pupil.lesson.backToSubject(lesson.subject.name)}
        </Link>
      }
      below={(preferences) => (
        <>
          {lesson.quiz && <QuizCard lesson={lesson} />}
          <FinishCard lesson={lesson} />
          {lesson.quiz && <TryHistory lessonId={lesson.id} script={preferences.script} />}
        </>
      )}
    />
  );
}

/** The quiz of the lesson: start it, go on with the open try, or wait for the next one. */
function QuizCard({ lesson }: { lesson: StudentLesson }) {
  const t = text.pupil.lesson;
  const quiz = lesson.myProgress.quiz;
  const waitLeft = useSecondsLeft(quiz?.nextAttemptAt);

  return (
    <section
      aria-labelledby="quiz-heading"
      className="mt-10 rounded-[1.75rem] bg-lilac p-6 print:hidden"
    >
      <h2 id="quiz-heading" className="font-display text-2xl font-semibold text-ink">
        {t.quizHeading}
      </h2>
      <p className="mt-1 text-ink">{t.quizIntro}</p>
      {quiz?.passed && <p className="mt-2 font-medium text-mint-ink">{t.quizPassed}</p>}
      {waitLeft > 0 && (
        <p role="timer" className="mt-2 font-medium text-butter-ink">
          {t.quizWait(formatClock(waitLeft))}
        </p>
      )}
      <Button asChild className="mt-4 h-12 px-6 text-base">
        <Link to={studentQuizPath(lesson.id)}>
          <PuzzlePieceIcon aria-hidden="true" weight="duotone" />
          {quiz?.openAttemptId ? t.continueQuiz : t.startQuiz}
        </Link>
      </Button>
    </section>
  );
}

/** "Završi lekciju": the server says when it works; here only the button follows it. */
function FinishCard({ lesson }: { lesson: StudentLesson }) {
  const t = text.pupil.lesson;
  const complete = useCompleteLesson(lesson.id);
  const [problem, setProblem] = useState<string | null>(null);
  const { completed, completedAt, canFinish } = lesson.myProgress;

  async function finish() {
    setProblem(null);
    try {
      await complete.mutateAsync();
    } catch (error) {
      setProblem(studentErrorMessage(error));
    }
  }

  return (
    <section
      aria-labelledby="finish-heading"
      className="mt-6 rounded-[1.75rem] bg-mint p-6 print:hidden"
    >
      <h2 id="finish-heading" className="font-display text-2xl font-semibold text-ink">
        {t.finishHeading}
      </h2>
      {/* Always rendered, so the result is announced when it appears. */}
      <div role="status" aria-live="polite">
        {completed && (
          <p className="mt-2 flex items-center gap-2 text-lg font-medium text-mint-ink">
            <StarIcon aria-hidden="true" weight="fill" className="size-7 text-butter-deep" />
            {t.finishedAt(formatDate(completedAt ?? new Date().toISOString()))}
          </p>
        )}
      </div>
      {!completed && canFinish && (
        <>
          <p className="mt-1 text-ink">{t.finishText}</p>
          <Button
            type="button"
            className="mt-4 h-12 px-6 text-base"
            disabled={complete.isPending}
            onClick={() => void finish()}
          >
            <CheckCircleIcon aria-hidden="true" weight="bold" />
            {complete.isPending ? t.finishing : t.finish}
          </Button>
        </>
      )}
      {!completed && !canFinish && <p className="mt-1 text-ink">{t.finishNeedsQuiz}</p>}
      {problem && (
        <p role="alert" className="mt-3 font-medium text-destructive">
          {problem}
        </p>
      )}
    </section>
  );
}

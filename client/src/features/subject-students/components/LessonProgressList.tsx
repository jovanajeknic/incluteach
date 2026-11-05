import { CheckCircleIcon, CircleIcon, XCircleIcon } from '@phosphor-icons/react';
import { useId, useState } from 'react';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { formatDate } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { useQuizHistory } from '../api/queries';
import type { ProgressItem, QuizAttempt } from '../api/studentsApi';

/** The published lessons of a subject, each marked done or not, with the quiz tries on demand. */
export function LessonProgressList({
  items,
  studentId,
}: {
  items: ProgressItem[];
  studentId: string;
}) {
  const t = text.teacher.students;

  if (items.length === 0) return <p className="text-ink-soft">{t.noLessons}</p>;

  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li key={item.id} className="rounded-3xl bg-card px-5 py-4 shadow-soft">
          <LessonRow item={item} studentId={studentId} />
        </li>
      ))}
    </ul>
  );
}

function LessonRow({ item, studentId }: { item: ProgressItem; studentId: string }) {
  const t = text.teacher.students;
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold break-words text-ink">{item.title}</p>
          <p
            className={cn(
              'mt-0.5 flex items-center gap-1.5 text-sm font-medium',
              item.completed ? 'text-mint-ink' : 'text-ink-soft',
            )}
          >
            {item.completed ? (
              <CheckCircleIcon aria-hidden="true" weight="fill" className="size-5" />
            ) : (
              <CircleIcon aria-hidden="true" weight="bold" className="size-5" />
            )}
            {item.completed && item.completedAt ? t.done(formatDate(item.completedAt)) : t.notDone}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? t.hideQuiz : t.showQuiz}
          <span className="sr-only">: {item.title}</span>
        </Button>
      </div>
      <div id={panelId} hidden={!open} className="mt-4">
        {/* Asked only when opened, so a long list does not make one request per lesson. */}
        {open && <QuizHistoryPanel lessonId={item.id} studentId={studentId} />}
      </div>
    </>
  );
}

function QuizHistoryPanel({ lessonId, studentId }: { lessonId: string; studentId: string }) {
  const t = text.teacher.students.quiz;
  const history = useQuizHistory(lessonId, studentId, true);

  if (history.isPending) return <LoadingState label={text.teacher.load.loading} />;
  if (history.isError) return <ErrorState onRetry={() => void history.refetch()} />;
  if (history.data.attempts.length === 0) return <p className="text-ink-soft">{t.noAttempts}</p>;

  const count = history.data.attempts.length;
  return (
    <ol className="grid gap-4">
      {history.data.attempts.map((attempt, index) => (
        // Newest first from the server, so the oldest try is number 1.
        <Attempt key={attempt.id} attempt={attempt} number={count - index} />
      ))}
    </ol>
  );
}

function Attempt({ attempt, number }: { attempt: QuizAttempt; number: number }) {
  const t = text.teacher.students.quiz;
  const wrong = attempt.answers.filter((answer) => !answer.correct).length;
  const summary =
    attempt.allCorrect === null
      ? t.unfinished
      : attempt.allCorrect
        ? t.allCorrect
        : t.someWrong(wrong, attempt.answers.length);

  return (
    <li className="rounded-2xl bg-paper p-4">
      <p className="font-display font-semibold text-ink">
        {t.attempt(number)} · <span className="font-medium text-ink-soft">{summary}</span>
        <span className="font-normal text-ink-soft"> · {formatDate(attempt.startedAt)}</span>
      </p>
      <ol className="mt-3 grid gap-3">
        {attempt.answers.map((answer) => (
          <li key={answer.position} className="text-ink">
            <p className="flex items-start gap-2 font-medium">
              {answer.correct ? (
                <CheckCircleIcon
                  aria-hidden="true"
                  weight="fill"
                  className="mt-0.5 size-5 shrink-0 text-mint-ink"
                />
              ) : (
                <XCircleIcon
                  aria-hidden="true"
                  weight="fill"
                  className="mt-0.5 size-5 shrink-0 text-blush-ink"
                />
              )}
              <span>
                {answer.prompt}
                <span className="sr-only"> ({answer.correct ? t.rightAnswer : t.wrongAnswer})</span>
              </span>
            </p>
            <p className="ml-7 text-sm text-ink-soft">
              {t.chosen}: {answer.chosenText}
              {!answer.correct && (
                <>
                  {' · '}
                  {t.correct}: {answer.correctText}
                </>
              )}
            </p>
            {answer.explanation && (
              <p className="ml-7 text-sm text-ink-soft">
                {t.explanation}: {answer.explanation}
              </p>
            )}
          </li>
        ))}
      </ol>
    </li>
  );
}

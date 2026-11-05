import { CheckCircleIcon, XCircleIcon } from '@phosphor-icons/react';
import { useId, useState } from 'react';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { formatDate } from '@/shared/lib/format';
import { displayInScript, type Script } from '@/shared/script/serbianScript';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { useMyTries } from '../api/queries';

/**
 * "Moji pokušaji": every try at the quiz, with each question, what the student chose, the right
 * answer and the explanation, so the mistakes can be read again. Asked for only when opened.
 */
export function TryHistory({
  lessonId,
  script,
  studentId,
}: {
  lessonId: string;
  script: Script;
  /** A parent looks at the tries of one child. */
  studentId?: string;
}) {
  const t = studentId ? text.guardian.history : text.pupil.history;
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const tries = useMyTries(lessonId, open, studentId);
  const show = (value: string) => displayInScript(value, script);

  return (
    <section aria-labelledby={`${panelId}-heading`} className="mt-10 print:hidden">
      <h2 id={`${panelId}-heading`} className="font-display text-2xl font-semibold text-ink">
        {t.heading}
      </h2>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="mt-3"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? t.hide : t.show}
      </Button>

      <div id={panelId} hidden={!open} className="mt-4">
        {open &&
          (tries.isPending ? (
            <LoadingState label={text.pupil.load.loading} />
          ) : tries.isError ? (
            <ErrorState onRetry={() => void tries.refetch()} />
          ) : tries.data.attempts.length === 0 ? (
            <p className="text-ink-soft">{t.none}</p>
          ) : (
            <ol className="grid gap-4">
              {tries.data.attempts.map((attempt, index) => {
                const wrong = attempt.answers.filter((answer) => !answer.correct).length;
                const summary =
                  attempt.allCorrect === null
                    ? t.unfinished
                    : attempt.allCorrect
                      ? t.allCorrect
                      : t.someWrong(wrong, attempt.answers.length);
                return (
                  <li key={attempt.id} className="rounded-3xl bg-card p-5 shadow-soft">
                    <p className="font-display font-semibold text-ink">
                      {/* Newest first from the server, so the oldest try is number 1. */}
                      {t.attempt(tries.data.attempts.length - index)} ·{' '}
                      <span className="font-medium text-ink-soft">{summary}</span>
                      <span className="font-normal text-ink-soft">
                        {' '}
                        · {formatDate(attempt.startedAt)}
                      </span>
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
                              {show(answer.prompt)}
                              <span className="sr-only">
                                {' '}
                                ({answer.correct ? t.rightMark : t.wrongMark})
                              </span>
                            </span>
                          </p>
                          <p className="ml-7 text-sm text-ink-soft">
                            {t.chosen}: {show(answer.chosenText)}
                            {!answer.correct && (
                              <>
                                {' · '}
                                {t.correct}: {show(answer.correctText)}
                              </>
                            )}
                          </p>
                          {answer.explanation && (
                            <p className="ml-7 text-sm text-ink-soft">
                              {t.explanation}: {show(answer.explanation)}
                            </p>
                          )}
                        </li>
                      ))}
                    </ol>
                  </li>
                );
              })}
            </ol>
          ))}
      </div>
    </section>
  );
}

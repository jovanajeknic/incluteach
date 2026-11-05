import { SparkleIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Button } from '@/shared/ui/button';
import { AiPulse } from '@/shared/visual/AiPulse';
import { text } from '@/text/sr-Latn';
import { lessonErrorMessage } from '../apiErrorMessage';
import { useAiName, useGenerate } from '../api/queries';
import type { Lesson } from '../api/lessonsApi';
import { aiFailureMessage } from './aiFailureMessage';

interface GeneratePanelProps {
  lesson: Lesson;
  /** The text has edits that were not saved; the AI reads the saved text. */
  textDirty: boolean;
}

/** Asks the AI for a summary and/or a quiz, and shows it at work or why it failed. */
export function GeneratePanel({ lesson, textDirty }: GeneratePanelProps) {
  const t = text.teacher.review.generate;
  const ai = useAiName();
  const generate = useGenerate(lesson.id);
  const [wantSummary, setWantSummary] = useState(true);
  const [wantQuiz, setWantQuiz] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);

  const working = lesson.status === 'processing';
  const published = lesson.status === 'published';
  const noText = lesson.body.trim().length === 0;
  const nothingChosen = !wantSummary && !wantQuiz;
  const blocked = working || published || noText || textDirty || generate.isPending;
  // Making it again replaces what is there, including the teacher's own edits.
  const replaces = (wantSummary && lesson.summary !== null) || (wantQuiz && lesson.quiz !== null);

  function start(parts = { summary: wantSummary, quiz: wantQuiz }) {
    setProblem(null);
    generate.mutate(parts, { onError: (error) => setProblem(lessonErrorMessage(error)) });
  }

  const label = wantSummary && wantQuiz ? t.button : t.buttonOne;
  const button = (
    <Button
      type="button"
      size="lg"
      disabled={blocked || nothingChosen}
      onClick={replaces ? undefined : () => start()}
      className="h-12 px-6"
    >
      <SparkleIcon aria-hidden="true" weight="fill" />
      {label}
    </Button>
  );

  return (
    <div className="mt-5">
      {ai.data === 'fake' && (
        <p className="mb-4 flex items-start gap-2 rounded-2xl bg-lilac px-4 py-3 font-medium text-lilac-ink">
          <SparkleIcon aria-hidden="true" weight="fill" className="mt-0.5 size-5 shrink-0" />
          {text.teacher.review.ai.fake}
        </p>
      )}
      {ai.data && ai.data !== 'fake' && (
        <p className="mb-4 text-ink-soft">{text.teacher.review.ai.real}</p>
      )}

      {working ? (
        <div role="status" className="flex items-center gap-4 rounded-3xl bg-lilac px-5 py-4">
          <AiPulse size="sm" />
          <div>
            <p className="font-display font-semibold text-lilac-ink">{t.working}</p>
            <p className="text-sm text-lilac-ink">{t.workingHint}</p>
          </div>
        </div>
      ) : published ? (
        <p className="text-ink-soft">{text.teacher.review.locked}</p>
      ) : (
        <>
          {lesson.processingError && (
            <div role="alert" className="mb-4 rounded-2xl bg-blush px-4 py-3 text-blush-ink">
              <p className="font-medium">{aiFailureMessage(lesson.processingError)}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 bg-card"
                disabled={blocked}
                onClick={() => start({ summary: true, quiz: true })}
              >
                {t.retry}
              </Button>
            </div>
          )}

          <fieldset className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <legend className="mb-2 font-medium text-ink">{t.legend}</legend>
            {[
              { label: t.summary, checked: wantSummary, set: setWantSummary },
              { label: t.quiz, checked: wantQuiz, set: setWantQuiz },
            ].map((option) => (
              <label key={option.label} className="inline-flex items-center gap-2 text-ink">
                <input
                  type="checkbox"
                  checked={option.checked}
                  onChange={(event) => option.set(event.target.checked)}
                  className="size-5 accent-forest"
                />
                {option.label}
              </label>
            ))}
          </fieldset>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            {replaces ? (
              <ConfirmDialog
                trigger={button}
                title={t.confirmTitle}
                description={t.confirmText}
                confirmLabel={t.confirmYes}
                cancelLabel={t.cancel}
                onConfirm={() => start()}
              />
            ) : (
              button
            )}
            {noText ? (
              <span className="text-sm text-ink-soft">{t.noText}</span>
            ) : textDirty ? (
              <span className="text-sm text-ink-soft">{t.unsavedText}</span>
            ) : null}
          </div>
          {problem && (
            <p role="alert" className="mt-3 font-medium text-destructive">
              {problem}
            </p>
          )}
        </>
      )}
    </div>
  );
}

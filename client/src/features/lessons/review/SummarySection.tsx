import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';
import { text } from '@/text/sr-Latn';
import { lessonErrorMessage } from '../apiErrorMessage';
import {
  SUMMARY_MAX_POINTS,
  SUMMARY_POINT_MAX_LENGTH,
  type Lesson,
  type Summary,
} from '../api/lessonsApi';
import { useApproveSummary, useDeleteSummary, useSaveSummary } from '../api/queries';
import { PartState } from './PartState';

const t = text.teacher.review.summary;

const summarySchema = z.object({
  points: z
    .array(
      z.object({
        text: z
          .string()
          .trim()
          .min(1, t.errors.pointRequired)
          .max(SUMMARY_POINT_MAX_LENGTH, t.errors.pointTooLong),
      }),
    )
    .min(1, t.errors.noPoints)
    .max(SUMMARY_MAX_POINTS, t.errors.tooMany),
});
type SummaryValues = z.output<typeof summarySchema>;

interface SummarySectionProps {
  lesson: Lesson;
  /** Published, or the AI is working: nothing can be changed. */
  locked: boolean;
  onDirtyChange: (part: string, dirty: boolean) => void;
}

/** The summary of the lesson: made by the AI or written by hand, edited and approved here. */
export function SummarySection({ lesson, locked, onDirtyChange }: SummarySectionProps) {
  const summary = lesson.summary;
  const remove = useDeleteSummary(lesson.id);
  const [writing, setWriting] = useState(false);
  // Kept here, not in the form: after deleting, the form is gone but the message stays.
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  return (
    <section aria-labelledby="summary-heading" className="mt-8">
      <h3 id="summary-heading" className="font-display text-xl font-semibold text-ink">
        {t.heading}
      </h3>

      {summary || writing ? (
        locked ? (
          <ReadOnlyPoints summary={summary} />
        ) : (
          <SummaryForm
            key={summary?.updatedAt ?? 'new'}
            lesson={lesson}
            summary={summary}
            onDirtyChange={onDirtyChange}
            onNotice={(message) => {
              setProblem(null);
              setNotice(message);
            }}
            onProblem={(message) => {
              setNotice(null);
              setProblem(message);
            }}
            onDelete={
              summary
                ? () =>
                    remove.mutate(undefined, {
                      onSuccess: () => {
                        setWriting(false);
                        setProblem(null);
                        setNotice(t.removed);
                      },
                      onError: (error) => setProblem(lessonErrorMessage(error)),
                    })
                : undefined
            }
          />
        )
      ) : (
        <div className="mt-3">
          <p className="text-ink-soft">{t.none}</p>
          {!locked && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="mt-3"
              onClick={() => {
                setNotice(null);
                setWriting(true);
              }}
            >
              {t.write}
            </Button>
          )}
        </div>
      )}

      <div role="status" aria-live="polite" className="empty:hidden">
        {notice && <p className="mt-3 font-medium text-mint-ink">{notice}</p>}
      </div>
      {problem && (
        <p role="alert" className="mt-3 font-medium text-destructive">
          {problem}
        </p>
      )}
    </section>
  );
}

function ReadOnlyPoints({ summary }: { summary: Summary | null }) {
  if (!summary) return null;
  return (
    <>
      <PartState origin={summary.origin} status={summary.status} outdated={summary.outdated} />
      <ul className="mt-3 list-disc space-y-1 pl-6 text-ink">
        {summary.points.map((point, index) => (
          <li key={index}>{point}</li>
        ))}
      </ul>
    </>
  );
}

interface SummaryFormProps {
  lesson: Lesson;
  summary: Summary | null;
  onDirtyChange: (part: string, dirty: boolean) => void;
  onNotice: (message: string) => void;
  onProblem: (message: string) => void;
  onDelete?: () => void;
}

function SummaryForm({
  lesson,
  summary,
  onDirtyChange,
  onNotice,
  onProblem,
  onDelete,
}: SummaryFormProps) {
  const save = useSaveSummary(lesson.id);
  const approve = useApproveSummary(lesson.id);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = useForm<SummaryValues>({
    resolver: zodResolver(summarySchema),
    defaultValues: {
      points: (summary?.points ?? ['']).map((point) => ({ text: point })),
    },
  });
  const { fields, append, remove, move } = useFieldArray({ control, name: 'points' });
  const typed = useWatch({ control, name: 'points' });

  // The page asks before leaving with edits that were not saved.
  useEffect(() => {
    onDirtyChange('summary', isDirty);
    return () => onDirtyChange('summary', false);
  }, [isDirty, onDirtyChange]);

  const busy = save.isPending || approve.isPending;
  // Approving says "this is right": what is saved is what gets approved.
  const canApprove =
    summary !== null && !isDirty && (summary.status === 'draft' || summary.outdated);
  const listError = errors.points?.root?.message ?? errors.points?.message;

  // `mutateAsync`, not `mutate` with callbacks: a saved summary replaces this form with a new
  // one, and callbacks of a form that is gone would never run. The messages live in the parent.
  async function onSave(values: SummaryValues) {
    try {
      await save.mutateAsync(values.points.map((point) => point.text));
      onNotice(t.saved);
    } catch (error) {
      onProblem(lessonErrorMessage(error));
    }
  }

  async function onApprove() {
    try {
      await approve.mutateAsync();
      onNotice(t.approved);
    } catch (error) {
      onProblem(lessonErrorMessage(error));
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSave)} className="mt-2">
      {summary && (
        <PartState origin={summary.origin} status={summary.status} outdated={summary.outdated} />
      )}

      <ol className="mt-4 grid gap-4">
        {fields.map((field, index) => {
          const error = errors.points?.[index]?.text?.message;
          const used = typed[index]?.text.length ?? 0;
          return (
            <li key={field.id} className="rounded-2xl bg-card p-4 shadow-soft">
              <label htmlFor={`point-${field.id}`} className="font-medium text-ink">
                {t.pointLabel(index + 1)}
              </label>
              <Textarea
                id={`point-${field.id}`}
                rows={2}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `point-${field.id}-error` : undefined}
                className="mt-2 rounded-xl bg-card text-base md:text-base"
                {...register(`points.${index}.text`)}
              />
              <p
                className={cn(
                  'mt-1 text-sm',
                  used > SUMMARY_POINT_MAX_LENGTH
                    ? 'font-medium text-destructive'
                    : 'text-ink-soft',
                )}
              >
                {t.counter(used, SUMMARY_POINT_MAX_LENGTH)}
              </p>
              {error && (
                <p
                  id={`point-${field.id}-error`}
                  className="mt-1 text-sm font-medium text-destructive"
                >
                  {error}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={index === 0}
                  aria-label={t.up(index + 1)}
                  onClick={() => move(index, index - 1)}
                >
                  <ArrowUpIcon aria-hidden="true" weight="bold" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={index === fields.length - 1}
                  aria-label={t.down(index + 1)}
                  onClick={() => move(index, index + 1)}
                >
                  <ArrowDownIcon aria-hidden="true" weight="bold" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={t.remove(index + 1)}
                  onClick={() => remove(index)}
                >
                  <TrashIcon aria-hidden="true" weight="bold" />
                </Button>
              </div>
            </li>
          );
        })}
      </ol>
      {listError && (
        <p role="alert" className="mt-3 font-medium text-destructive">
          {listError}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={fields.length >= SUMMARY_MAX_POINTS}
          onClick={() => append({ text: '' }, { shouldFocus: true })}
        >
          <PlusIcon aria-hidden="true" weight="bold" />
          {t.add}
        </Button>
        <Button type="submit" size="lg" disabled={busy || !isDirty}>
          {save.isPending ? t.saving : t.save}
        </Button>
        {summary && (
          <Button
            type="button"
            size="lg"
            variant="accent"
            disabled={busy || !canApprove}
            onClick={() => void onApprove()}
          >
            {approve.isPending ? t.approving : t.approve}
          </Button>
        )}
        {onDelete && (
          <ConfirmDialog
            destructive
            trigger={
              <Button type="button" variant="outline" size="lg" disabled={busy}>
                {t.remove_all}
              </Button>
            }
            title={t.removeTitle}
            description={t.removeText}
            confirmLabel={t.removeYes}
            cancelLabel={text.teacher.review.generate.cancel}
            onConfirm={onDelete}
          />
        )}
      </div>
      {summary && isDirty && <p className="mt-2 text-sm text-ink-soft">{t.approveFirstSave}</p>}
    </form>
  );
}

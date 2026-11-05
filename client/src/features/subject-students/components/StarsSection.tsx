import { zodResolver } from '@hookform/resolvers/zod';
import { ChatCircleDotsIcon, StarIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { useSession } from '@/features/auth/api/session';
import { lessonErrorMessage } from '@/features/lessons/apiErrorMessage';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { ErrorState } from '@/shared/components/ErrorState';
import { FormField } from '@/shared/components/FormField';
import { LoadingState } from '@/shared/components/LoadingState';
import { formatDate } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { text } from '@/text/sr-Latn';
import { useGiveStar, useStudentStars, useTakeBackStar } from '../api/queries';
import { STAR_MESSAGE_MAX_LENGTH, type Star } from '../api/studentsApi';

const t = text.teacher.students;

const messageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, t.messageRequired)
    .max(STAR_MESSAGE_MAX_LENGTH, t.messageTooLong),
});
type MessageValues = z.output<typeof messageSchema>;

/**
 * The two kinds of stars look clearly different: a filled star in yellow for a finished
 * lesson, and a speech bubble in lilac for a teacher's own, which carries a message.
 */
const kinds = {
  automatic: { icon: StarIcon, tone: 'bg-butter text-butter-ink' },
  teacher: { icon: ChatCircleDotsIcon, tone: 'bg-lilac text-lilac-ink' },
} as const;

export function StarsSection({ subjectId, studentId }: { subjectId: string; studentId: string }) {
  const stars = useStudentStars(subjectId, studentId);

  return (
    <section aria-labelledby="stars-heading" className="mt-10">
      <h2 id="stars-heading" className="font-display text-2xl font-semibold text-ink">
        {t.starsHeading}
      </h2>

      {stars.isPending ? (
        <LoadingState label={text.teacher.load.loading} />
      ) : stars.isError ? (
        <ErrorState onRetry={() => void stars.refetch()} />
      ) : (
        <>
          <p className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-ink">
            <span>{t.starCountAutomatic(stars.data.counts.automatic)}</span>
            <span>{t.starCountTeacher(stars.data.counts.teacher)}</span>
          </p>
          {stars.data.stars.length === 0 ? (
            <p className="mt-3 text-ink-soft">{t.noStars}</p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {stars.data.stars.map((star) => (
                <li key={star.id}>
                  <StarCard star={star} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <GiveStarForm subjectId={subjectId} studentId={studentId} />
    </section>
  );
}

function StarCard({ star }: { star: Star }) {
  const { user } = useSession();
  const takeBack = useTakeBackStar();
  const [problem, setProblem] = useState<string | null>(null);
  const { icon: KindIcon, tone } = kinds[star.source];
  // Only a star the signed-in teacher gave can be taken back; the server checks it too.
  const canTakeBack = star.source === 'teacher' && star.givenBy?.id === user?.id;

  return (
    <div className="flex items-start gap-4 rounded-3xl bg-card px-5 py-4 shadow-soft">
      <span
        aria-hidden="true"
        className={cn('flex size-11 shrink-0 items-center justify-center rounded-full', tone)}
      >
        <KindIcon weight="fill" className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display font-semibold text-ink">{t.starKinds[star.source]}</p>
        <p className="break-words text-ink">
          {star.source === 'automatic' ? star.lesson?.title : star.message}
        </p>
        <p className="mt-0.5 text-sm text-ink-soft">
          {star.givenBy && <>{t.starFrom(star.givenBy.fullName)} · </>}
          {formatDate(star.createdAt)}
        </p>
        {problem && (
          <p role="alert" className="mt-2 text-sm font-medium text-destructive">
            {problem}
          </p>
        )}
      </div>
      {canTakeBack && (
        <ConfirmDialog
          destructive
          trigger={
            <Button type="button" variant="outline" size="sm" disabled={takeBack.isPending}>
              {t.takeBack}
            </Button>
          }
          title={t.takeBackTitle}
          description={t.takeBackText}
          confirmLabel={t.takeBackYes}
          cancelLabel={t.cancel}
          onConfirm={() => {
            setProblem(null);
            takeBack.mutate(star.id, { onError: (error) => setProblem(lessonErrorMessage(error)) });
          }}
        />
      )}
    </div>
  );
}

function GiveStarForm({ subjectId, studentId }: { subjectId: string; studentId: string }) {
  const give = useGiveStar();
  const [outcome, setOutcome] = useState<{ ok: boolean; message: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<MessageValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: { message: '' },
  });
  const message = useWatch({ control, name: 'message' });

  async function onValid(values: MessageValues) {
    setOutcome(null);
    try {
      await give.mutateAsync({ studentId, subjectId, message: values.message });
      reset({ message: '' });
      setOutcome({ ok: true, message: t.given });
    } catch (error) {
      // The message stays, so it does not have to be typed again.
      setOutcome({ ok: false, message: lessonErrorMessage(error) });
    }
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onValid, () => setOutcome(null))}
      className="mt-8 flex max-w-xl flex-col gap-3 rounded-3xl bg-lilac/40 p-5"
    >
      <h3 className="font-display text-xl font-semibold text-ink">{t.giveHeading}</h3>
      <FormField
        id="star-message"
        label={t.giveLabel}
        hint={t.giveHint}
        error={errors.message?.message}
        required
      >
        {(props) => (
          <Input
            {...props}
            {...register('message')}
            autoComplete="off"
            className="h-12 rounded-2xl bg-card text-base md:text-base"
          />
        )}
      </FormField>
      <p
        className={cn(
          'text-sm',
          message.length > STAR_MESSAGE_MAX_LENGTH
            ? 'font-medium text-destructive'
            : 'text-ink-soft',
        )}
      >
        {t.giveCounter(message.length, STAR_MESSAGE_MAX_LENGTH)}
      </p>
      <div>
        <Button type="submit" size="lg" disabled={isSubmitting} aria-busy={isSubmitting}>
          <StarIcon aria-hidden="true" weight="fill" />
          {isSubmitting ? t.giving : t.give}
        </Button>
      </div>
      <div role="status" aria-live="polite">
        {outcome && (
          <p
            className={cn('font-medium', outcome.ok ? 'text-mint-ink' : 'text-destructive')}
            role={outcome.ok ? undefined : 'alert'}
          >
            {outcome.message}
          </p>
        )}
      </div>
    </form>
  );
}

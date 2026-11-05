import { ChatCircleDotsIcon, StarIcon } from '@phosphor-icons/react';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { formatDate } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { text } from '@/text/sr-Latn';
import { useMyStars } from '../api/queries';
import type { Star } from '../api/studentApi';

const t = text.pupil.stars;

/**
 * The two kinds of stars look clearly different: a filled star in yellow for a finished
 * lesson, and a speech bubble in lilac for one from a teacher, which carries a message.
 */
const kinds = {
  automatic: { icon: StarIcon, tone: 'bg-butter text-butter-ink' },
  teacher: { icon: ChatCircleDotsIcon, tone: 'bg-lilac text-lilac-ink' },
} as const;

/** The stars of the student, or of a child when a parent looks: the totals and each star. */
export function StarsView({ studentId }: { studentId?: string }) {
  const stars = useMyStars(studentId);
  const empty = studentId ? text.guardian.stars.empty : t.empty;

  if (stars.isPending) return <LoadingState label={text.pupil.load.loading} />;
  if (stars.isError) return <ErrorState onRetry={() => void stars.refetch()} />;

  return (
    <>
      <p className="mt-6 flex flex-wrap gap-x-6 gap-y-1 font-display text-lg font-medium text-ink">
        <span>{t.countAutomatic(stars.data.counts.automatic)}</span>
        <span>{t.countTeacher(stars.data.counts.teacher)}</span>
      </p>
      {stars.data.stars.length === 0 ? (
        <p className="mt-6 text-lg text-ink-soft">{empty}</p>
      ) : (
        <ul className="mt-6 grid max-w-3xl gap-3">
          {stars.data.stars.map((star) => (
            <li key={star.id}>
              <StarEntry star={star} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function StarEntry({ star }: { star: Star }) {
  const { icon: KindIcon, tone } = kinds[star.source];
  return (
    <div className="flex items-start gap-4 rounded-3xl bg-card px-5 py-4 shadow-soft">
      <span
        aria-hidden="true"
        className={cn('flex size-11 shrink-0 items-center justify-center rounded-full', tone)}
      >
        <KindIcon weight="fill" className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display font-semibold text-ink">{t[star.source]}</p>
        <p className="break-words text-ink">
          {star.source === 'automatic' ? star.lesson?.title : star.message}
        </p>
        <p className="mt-0.5 text-sm text-ink-soft">
          {t.subject(star.subject.name)}
          {star.givenBy && <> · {t.from(star.givenBy.fullName)}</>} · {formatDate(star.createdAt)}
        </p>
      </div>
    </div>
  );
}

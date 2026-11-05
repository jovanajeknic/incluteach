import { ArrowLeftIcon, ChatCircleDotsIcon, StarIcon } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { formatDate } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { text } from '@/text/sr-Latn';
import { useMyStars } from '../api/queries';
import type { Star } from '../api/studentApi';
import { studentHomePath } from '../paths';

const t = text.pupil.stars;

/**
 * The two kinds of stars look clearly different: a filled star in yellow for a finished
 * lesson, and a speech bubble in lilac for one from a teacher, which carries a message.
 */
const kinds = {
  automatic: { icon: StarIcon, tone: 'bg-butter text-butter-ink' },
  teacher: { icon: ChatCircleDotsIcon, tone: 'bg-lilac text-lilac-ink' },
} as const;

/** "Moje zvjezdice": the stars for effort, with what each was for. */
export function StarsPage() {
  const stars = useMyStars();

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <Link
        to={studentHomePath}
        className="inline-flex items-center gap-1.5 rounded-full font-display font-medium text-ink-soft hover:text-forest"
      >
        <ArrowLeftIcon aria-hidden="true" weight="bold" className="size-4" />
        {text.pupil.subject.back}
      </Link>
      <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight text-ink">
        {t.heading}
      </h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{t.intro}</p>

      {stars.isPending ? (
        <LoadingState label={text.pupil.load.loading} />
      ) : stars.isError ? (
        <ErrorState onRetry={() => void stars.refetch()} />
      ) : (
        <>
          <p className="mt-6 flex flex-wrap gap-x-6 gap-y-1 font-display text-lg font-medium text-ink">
            <span>{t.countAutomatic(stars.data.counts.automatic)}</span>
            <span>{t.countTeacher(stars.data.counts.teacher)}</span>
          </p>
          {stars.data.stars.length === 0 ? (
            <p className="mt-6 text-lg text-ink-soft">{t.empty}</p>
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

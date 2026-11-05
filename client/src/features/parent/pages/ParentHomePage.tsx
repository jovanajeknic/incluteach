import { ArrowRightIcon, StarIcon, UserCircleIcon } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { subjectAppearance } from '@/features/lessons/subjectAppearance';
import { useMyRequests, useMyStars, useSubjectProgress } from '@/features/student/api/queries';
import type { Enrollment } from '@/features/student/api/studentApi';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { blobShape } from '@/shared/visual/subjectIcons';
import { SubjectBlob } from '@/shared/visual/SubjectBlob';
import { text } from '@/text/sr-Latn';
import { useChildren } from '../api/queries';
import type { Child } from '../api/parentApi';
import { childPath } from '../paths';

const t = text.guardian.home;

/** "Moja djeca": the children linked to the parent, each with the subjects and the progress. */
export function ParentHomePage() {
  const children = useChildren();

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">{t.heading}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{t.intro}</p>

      {children.isPending ? (
        <LoadingState label={text.pupil.load.loading} />
      ) : children.isError ? (
        <ErrorState onRetry={() => void children.refetch()} />
      ) : children.data.children.length === 0 ? (
        <p className="mt-8 max-w-2xl rounded-3xl bg-card p-6 text-lg text-ink shadow-soft">
          {t.empty}
        </p>
      ) : (
        <ul className="mt-8 grid gap-5 lg:grid-cols-2">
          {children.data.children.map((child) => (
            <li key={child.id}>
              <ChildCard child={child} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ChildCard({ child }: { child: Child }) {
  const requests = useMyRequests(child.id);
  const stars = useMyStars(child.id);
  const joined = requests.data?.enrollments.filter((item) => item.status === 'approved') ?? [];
  const waitingForParent =
    requests.data?.enrollments.filter((item) => item.status === 'awaiting_parent').length ?? 0;
  const totalStars = stars.data ? stars.data.counts.automatic + stars.data.counts.teacher : 0;

  return (
    <article
      aria-labelledby={`child-${child.id}`}
      className="h-full rounded-[2rem] bg-card p-6 shadow-soft"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id={`child-${child.id}`}
          className="flex items-center gap-3 font-display text-2xl font-semibold text-ink"
        >
          <span
            aria-hidden="true"
            className={`flex size-11 items-center justify-center bg-sky text-sky-ink ${blobShape}`}
          >
            <UserCircleIcon weight="duotone" className="size-7" />
          </span>
          {child.fullName}
        </h2>
        {stars.data && (
          <p className="flex items-center gap-1.5 font-display font-medium text-butter-ink">
            <StarIcon aria-hidden="true" weight="fill" className="size-5 text-butter-deep" />
            {t.starsOf(totalStars)}
          </p>
        )}
      </div>

      {waitingForParent > 0 && (
        <p className="mt-3 font-medium text-butter-ink">{t.waiting(waitingForParent)}</p>
      )}

      <div className="mt-4">
        {requests.isPending ? (
          <LoadingState label={text.pupil.load.loading} />
        ) : requests.isError ? (
          <ErrorState onRetry={() => void requests.refetch()} />
        ) : joined.length === 0 ? (
          <p className="text-ink-soft">{t.noSubjects}</p>
        ) : (
          <ul className="grid gap-2">
            {joined.map((enrollment) => (
              <li key={enrollment.id}>
                <SubjectLine enrollment={enrollment} studentId={child.id} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link
        to={childPath(child.id)}
        aria-label={t.open(child.fullName)}
        className="mt-5 inline-flex items-center gap-1.5 font-display font-medium text-forest underline underline-offset-4"
      >
        {t.open(child.fullName)}
        <ArrowRightIcon aria-hidden="true" weight="bold" className="size-4" />
      </Link>
    </article>
  );
}

function SubjectLine({ enrollment, studentId }: { enrollment: Enrollment; studentId: string }) {
  const { subject } = enrollment;
  const progress = useSubjectProgress(subject.id, studentId);
  const done = progress.data?.lessons.completed ?? 0;
  const published = progress.data?.lessons.published ?? 0;

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-paper px-4 py-2.5">
      <SubjectBlob subject={subjectAppearance(subject.id, subject.name)} size="md" />
      <span className="min-w-0 flex-1">
        <span className="block font-display font-semibold text-ink">{subject.name}</span>
        <span className="block text-sm text-ink-soft">
          {text.pupil.subject.meta(subject.className)}
        </span>
      </span>
      {progress.data && published > 0 && (
        <span className="text-sm font-medium text-ink">
          {text.pupil.home.doneCount(done, published)}
        </span>
      )}
    </div>
  );
}

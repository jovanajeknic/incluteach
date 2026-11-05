import { ArrowLeftIcon, PlusIcon } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { Link, useParams } from 'react-router';
import { useMyRequests } from '@/features/student/api/queries';
import { RequestRow } from '@/features/student/components/CatalogBrowser';
import { StarsView } from '@/features/student/components/StarsView';
import { SubjectTile } from '@/features/student/components/SubjectTile';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { itemMotion, listMotion } from '@/shared/motion/listMotion';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { ChildGate } from '../components/ChildGate';
import { childJoinPath, childSubjectPath, parentHomePath } from '../paths';

const t = text.guardian.child;

/** One child: the subjects joined, the requests that wait, and the stars. */
export function ChildPage() {
  const { childId = '' } = useParams();
  return (
    <ChildGate childId={childId}>
      {(child) => <Child id={child.id} name={child.fullName} />}
    </ChildGate>
  );
}

function Child({ id, name }: { id: string; name: string }) {
  const requests = useMyRequests(id);
  const joined = requests.data?.enrollments.filter((item) => item.status === 'approved') ?? [];
  const pending = requests.data?.enrollments.filter((item) => item.status !== 'approved') ?? [];

  return (
    <>
      <title>{text.app.pageTitle(name)}</title>
      <Link
        to={parentHomePath}
        className="inline-flex items-center gap-1.5 rounded-full font-display font-medium text-ink-soft hover:text-forest"
      >
        <ArrowLeftIcon aria-hidden="true" weight="bold" className="size-4" />
        {t.back}
      </Link>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-4xl font-semibold tracking-tight break-words text-ink">
          {name}
        </h1>
        <Button asChild size="lg" className="h-12 px-6 text-base">
          <Link to={childJoinPath(id)}>
            <PlusIcon aria-hidden="true" weight="bold" />
            {t.join}
          </Link>
        </Button>
      </div>

      <section aria-labelledby="child-subjects" className="mt-10">
        <h2 id="child-subjects" className="font-display text-2xl font-semibold text-ink">
          {t.subjectsHeading}
        </h2>
        {requests.isPending ? (
          <LoadingState label={text.pupil.load.loading} />
        ) : requests.isError ? (
          <ErrorState onRetry={() => void requests.refetch()} />
        ) : joined.length === 0 ? (
          <p className="mt-3 text-lg text-ink-soft">{t.noSubjects}</p>
        ) : (
          <motion.ul
            variants={listMotion}
            initial="hidden"
            animate="show"
            className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
          >
            {joined.map((enrollment) => (
              <motion.li key={enrollment.id} variants={itemMotion}>
                <SubjectTile
                  enrollment={enrollment}
                  studentId={id}
                  to={childSubjectPath(id, enrollment.subject.id)}
                />
              </motion.li>
            ))}
          </motion.ul>
        )}
      </section>

      <section aria-labelledby="child-requests" className="mt-12 max-w-3xl">
        <h2 id="child-requests" className="font-display text-2xl font-semibold text-ink">
          {t.requestsHeading}
        </h2>
        {requests.data &&
          (pending.length === 0 ? (
            <p className="mt-3 text-ink-soft">{t.requestsEmpty}</p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {pending.map((request) => (
                <li key={request.id}>
                  <RequestRow request={request} />
                </li>
              ))}
            </ul>
          ))}
      </section>

      <section aria-labelledby="child-stars" className="mt-12">
        <h2 id="child-stars" className="font-display text-2xl font-semibold text-ink">
          {t.starsHeading}
        </h2>
        <StarsView studentId={id} />
      </section>
    </>
  );
}

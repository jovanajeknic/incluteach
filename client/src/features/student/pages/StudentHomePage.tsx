import { ArrowRightIcon, StarIcon } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { useSession } from '@/features/auth/api/session';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { itemMotion, listMotion } from '@/shared/motion/listMotion';
import { text } from '@/text/sr-Latn';
import { SubjectTile } from '../components/SubjectTile';
import { useMyRequests, useMyStars } from '../api/queries';
import { studentJoinPath, studentStarsPath, subjectPath } from '../paths';

/** "Moji predmeti": the subjects the student joined, with how far they got in each. */
export function StudentHomePage() {
  const t = text.pupil.home;
  const { user } = useSession();
  const requests = useMyRequests();
  const stars = useMyStars();

  const joined = requests.data?.enrollments.filter((item) => item.status === 'approved') ?? [];
  const waiting =
    requests.data?.enrollments.filter(
      (item) => item.status === 'awaiting_parent' || item.status === 'awaiting_teacher',
    ).length ?? 0;
  const totalStars = stars.data ? stars.data.counts.automatic + stars.data.counts.teacher : 0;
  const firstName = user?.fullName.split(' ')[0] ?? '';

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {firstName && (
            <p className="font-display text-lg font-medium text-forest">{t.greeting(firstName)}</p>
          )}
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">
            {t.heading}
          </h1>
        </div>
        <motion.div whileHover={{ rotate: -3, scale: 1.04 }} whileTap={{ scale: 0.97 }}>
          <Link
            to={studentStarsPath}
            className="flex items-center gap-3 rounded-3xl bg-butter px-5 py-3 shadow-soft"
          >
            <StarIcon aria-hidden="true" weight="fill" className="size-8 text-butter-deep" />
            <span>
              <span className="block font-display text-sm text-butter-ink">{t.starsLabel}</span>
              <span className="block font-display text-2xl leading-none font-bold text-ink">
                {totalStars}
              </span>
            </span>
          </Link>
        </motion.div>
      </div>

      {waiting > 0 && (
        <p className="mt-4">
          <Link
            to={studentJoinPath}
            className="font-display font-medium text-forest underline underline-offset-4"
          >
            {t.waiting(waiting)}
          </Link>
        </p>
      )}

      <section aria-labelledby="subjects-heading" className="mt-10">
        <h2 id="subjects-heading" className="sr-only">
          {t.subjectsHeading}
        </h2>

        {requests.isPending ? (
          <LoadingState label={text.pupil.load.loading} />
        ) : requests.isError ? (
          <ErrorState onRetry={() => void requests.refetch()} />
        ) : joined.length === 0 ? (
          <div className="rounded-3xl bg-card p-6 shadow-soft">
            <p className="text-lg text-ink">{t.empty}</p>
            <Link
              to={studentJoinPath}
              className="mt-3 inline-flex items-center gap-1.5 font-display font-medium text-forest underline underline-offset-4"
            >
              {t.emptyAction}
              <ArrowRightIcon aria-hidden="true" weight="bold" className="size-4" />
            </Link>
          </div>
        ) : (
          <motion.ul
            variants={listMotion}
            initial="hidden"
            animate="show"
            className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
          >
            {joined.map((enrollment) => (
              <motion.li key={enrollment.id} variants={itemMotion}>
                <SubjectTile enrollment={enrollment} to={subjectPath(enrollment.subject.id)} />
              </motion.li>
            ))}
          </motion.ul>
        )}
      </section>
    </>
  );
}

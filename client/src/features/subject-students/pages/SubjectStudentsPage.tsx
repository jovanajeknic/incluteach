import { StarIcon } from '@phosphor-icons/react';
import { Link, useParams, useSearchParams } from 'react-router';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { cn } from '@/shared/lib/utils';
import { text } from '@/text/sr-Latn';
import type { TeacherSubject } from '@/features/lessons/api/lessonsApi';
import { SubjectFrame } from '@/features/lessons/components/SubjectFrame';
import { subjectStudentPath } from '@/features/lessons/paths';
import { useRanking } from '../api/queries';

/** The value of the filter that shows every odeljenje of the subject. */
const ALL = 'sva';

/**
 * The students of a subject. The same subject taught in several odeljenja (Matematika in 5-2
 * and 5-3) is a separate subject for each, so the filter picks one of them or shows all.
 */
export function SubjectStudentsPage() {
  const { subjectId = '' } = useParams();

  return (
    <SubjectFrame subjectId={subjectId}>
      {(subject, all) => <Students subject={subject} all={all} />}
    </SubjectFrame>
  );
}

function Students({ subject, all }: { subject: TeacherSubject; all: TeacherSubject[] }) {
  const t = text.teacher.students;
  const [params, setParams] = useSearchParams();

  // Same name in another odeljenje, by class name so the buttons read 5-2, 5-3.
  const siblings = all
    .filter((item) => item.name.toLowerCase() === subject.name.toLowerCase())
    .sort((a, b) => a.className.localeCompare(b.className, 'sr-Latn', { numeric: true }));

  const requested = params.get('odjeljenje');
  const shown =
    requested === ALL
      ? siblings
      : siblings.filter((item) => item.id === requested).length > 0
        ? siblings.filter((item) => item.id === requested)
        : [subject];
  const selected = requested === ALL ? ALL : (shown[0]?.id ?? subject.id);

  function choose(value: string) {
    setParams(value === subject.id ? {} : { odjeljenje: value }, { replace: true });
  }

  return (
    <>
      <title>{text.app.pageTitle(`${t.tabStudents} · ${subject.name}`)}</title>

      {siblings.length > 1 && (
        <div role="group" aria-label={t.filterLabel} className="mt-6 flex flex-wrap gap-2">
          {[
            { value: ALL, label: t.filterAll },
            ...siblings.map((item) => ({ value: item.id, label: item.className })),
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected === option.value}
              onClick={() => choose(option.value)}
              className={cn(
                'rounded-full border-2 px-4 py-1.5 font-display font-medium transition-colors',
                selected === option.value
                  ? 'border-forest bg-card text-ink'
                  : 'border-border text-ink-soft hover:border-forest/40 hover:text-ink',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-10">
        {shown.map((item) => (
          <RankingTable
            key={item.id}
            subject={item}
            // With several tables each is named by its odeljenje.
            showHeading={shown.length > 1}
          />
        ))}
      </div>

      <p className="mt-8 text-sm text-ink-soft">{t.onlyYou}</p>
    </>
  );
}

function RankingTable({ subject, showHeading }: { subject: TeacherSubject; showHeading: boolean }) {
  const t = text.teacher.students;
  const ranking = useRanking(subject.id);

  return (
    <section aria-labelledby={showHeading ? `ranking-${subject.id}` : undefined}>
      {showHeading && (
        <h2
          id={`ranking-${subject.id}`}
          className="mb-3 font-display text-2xl font-semibold text-ink"
        >
          {text.teacher.home.classHeading(subject.className)}
        </h2>
      )}

      {ranking.isPending ? (
        <LoadingState label={text.teacher.load.loading} />
      ) : ranking.isError ? (
        <ErrorState onRetry={() => void ranking.refetch()} />
      ) : ranking.data.students.length === 0 ? (
        <p className="text-lg text-ink-soft">{t.empty}</p>
      ) : (
        <>
          {ranking.data.publishedLessons === 0 && (
            <p className="mb-3 text-ink-soft">{t.noPublished}</p>
          )}
          <div className="overflow-x-auto rounded-3xl bg-card shadow-soft">
            <table className="w-full min-w-[22rem] border-collapse text-left">
              <caption className="sr-only">{t.tableCaption(subject.className)}</caption>
              <thead>
                <tr className="border-b border-border text-sm text-ink-soft">
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t.columns.rank}
                  </th>
                  <th scope="col" className="px-2 py-3 font-medium">
                    {t.columns.student}
                  </th>
                  <th scope="col" className="px-2 py-3 font-medium">
                    {t.columns.lessons}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t.columns.stars}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranking.data.students.map((row) => (
                  <tr key={row.student.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-display font-semibold text-ink-soft">
                      {row.rank}
                    </td>
                    <th scope="row" className="px-2 py-3 font-display font-semibold text-ink">
                      <Link
                        to={subjectStudentPath(subject.id, row.student.id)}
                        className="rounded-sm underline decoration-ochre decoration-2 underline-offset-4 hover:text-forest"
                      >
                        {row.student.fullName}
                      </Link>
                    </th>
                    <td className="px-2 py-3 whitespace-nowrap text-ink">
                      {t.lessonsOf(row.completedLessons, ranking.data.publishedLessons)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink">
                      <StarIcon
                        aria-hidden="true"
                        weight="fill"
                        className="mr-1 inline size-4 text-butter-ink"
                      />
                      <span className="sr-only">
                        {t.starsOf(row.stars.automatic, row.stars.teacher)}
                      </span>
                      <span aria-hidden="true">{row.stars.automatic + row.stars.teacher}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

import { ArrowLeftIcon, CaretRightIcon, CheckCircleIcon, CircleIcon } from '@phosphor-icons/react';
import { Link, useParams } from 'react-router';
import { subjectAppearance } from '@/features/lessons/subjectAppearance';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { MessagePage } from '@/shared/components/MessagePage';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { SubjectBlob } from '@/shared/visual/SubjectBlob';
import { subjectTheme } from '@/shared/visual/subjectIcons';
import { text } from '@/text/sr-Latn';
import { useMyRequests, useSubjectLessons, useSubjectProgress } from '../api/queries';
import type { LessonListItem } from '../api/studentApi';
import { studentHomePath, studentLessonPath } from '../paths';

const t = text.pupil.subject;

/** The lessons of one subject the student joined, with the ones already finished marked. */
export function SubjectPage() {
  const { subjectId = '' } = useParams();
  const requests = useMyRequests();
  const lessons = useSubjectLessons(subjectId);
  const progress = useSubjectProgress(subjectId);

  if (requests.isPending) return <LoadingState label={text.pupil.load.loading} />;
  if (requests.isError) return <ErrorState onRetry={() => void requests.refetch()} />;

  const enrollment = requests.data.enrollments.find(
    (item) => item.status === 'approved' && item.subject.id === subjectId,
  );
  if (!enrollment) {
    return (
      <>
        <title>{text.app.pageTitle(t.notFoundTitle)}</title>
        <MessagePage
          title={t.notFoundTitle}
          description={t.notFoundDescription}
          action={
            <Button asChild variant="outline" size="lg">
              <Link to={studentHomePath}>{t.back}</Link>
            </Button>
          }
        />
      </>
    );
  }

  const { subject } = enrollment;
  const appearance = subjectAppearance(subject.id, subject.name);
  const theme = subjectTheme[appearance.color];
  const doneIds = new Set(
    progress.data?.items.filter((item) => item.completed).map((item) => item.id) ?? [],
  );
  const published = progress.data?.lessons.published ?? 0;
  const done = progress.data?.lessons.completed ?? 0;

  return (
    <>
      <title>{text.app.pageTitle(subject.name)}</title>
      <Link
        to={studentHomePath}
        className="inline-flex items-center gap-1.5 rounded-full font-display font-medium text-ink-soft hover:text-forest"
      >
        <ArrowLeftIcon aria-hidden="true" weight="bold" className="size-4" />
        {t.back}
      </Link>

      <header
        className={cn('relative mt-5 overflow-hidden rounded-[2.25rem] p-6 sm:p-8', theme.surface)}
      >
        <span
          aria-hidden="true"
          className={cn(
            'absolute -right-14 -bottom-20 size-56 rounded-full opacity-40',
            theme.deep,
          )}
        />
        <div className="relative flex flex-wrap items-center gap-5">
          <SubjectBlob subject={appearance} size="xl" className="bg-card" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">
              {subject.name}
            </h1>
            <p className={cn('mt-1 font-display text-lg font-medium', theme.ink)}>
              {t.meta(subject.className)}
              {subject.teacher && !subject.teacher.deleted && <> · {subject.teacher.fullName}</>}
            </p>
            {progress.data && published > 0 && (
              <>
                <p className="mt-3 text-ink">{t.progress(done, published)}</p>
                <div
                  role="progressbar"
                  aria-label={t.progressLabel}
                  aria-valuemin={0}
                  aria-valuemax={published}
                  aria-valuenow={done}
                  aria-valuetext={t.progress(done, published)}
                  className="mt-2 h-3 max-w-xs overflow-hidden rounded-full bg-card/70"
                >
                  <div
                    className={cn('h-full rounded-full', theme.deep)}
                    style={{ width: `${(done / published) * 100}%` }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <section aria-labelledby="lessons-heading" className="mt-8">
        <h2 id="lessons-heading" className="font-display text-2xl font-semibold text-ink">
          {t.lessonsHeading}
        </h2>
        {lessons.isPending ? (
          <LoadingState label={text.pupil.load.loading} />
        ) : lessons.isError ? (
          <ErrorState onRetry={() => void lessons.refetch()} />
        ) : lessons.data.lessons.length === 0 ? (
          <p className="mt-3 text-lg text-ink-soft">{t.empty}</p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {lessons.data.lessons.map((lesson) => (
              <li key={lesson.id}>
                <LessonRow lesson={lesson} done={doneIds.has(lesson.id)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function LessonRow({ lesson, done }: { lesson: LessonListItem; done: boolean }) {
  return (
    <Link
      to={studentLessonPath(lesson.id)}
      className="group flex items-center gap-4 rounded-3xl bg-card px-5 py-4 shadow-soft transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lifted"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg font-semibold break-words text-ink">
          {lesson.title}
        </span>
        <span
          className={cn(
            'mt-0.5 flex items-center gap-1.5 text-sm font-medium',
            done ? 'text-mint-ink' : 'text-ink-soft',
          )}
        >
          {done ? (
            <CheckCircleIcon aria-hidden="true" weight="fill" className="size-5" />
          ) : (
            <CircleIcon aria-hidden="true" weight="bold" className="size-5" />
          )}
          {done ? t.done : t.notDone}
        </span>
      </span>
      <CaretRightIcon
        aria-hidden="true"
        weight="bold"
        className="size-5 shrink-0 text-ink-soft transition-transform group-hover:translate-x-1"
      />
    </Link>
  );
}

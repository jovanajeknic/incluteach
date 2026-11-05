import { ArrowLeftIcon, CaretRightIcon, PlusIcon } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { MessagePage } from '@/shared/components/MessagePage';
import { formatDate } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { AiPulse } from '@/shared/visual/AiPulse';
import { SubjectBlob } from '@/shared/visual/SubjectBlob';
import { subjectTheme } from '@/shared/visual/subjectIcons';
import { text } from '@/text/sr-Latn';
import { LESSON_STATES, type LessonListItem, type LessonState } from '../api/lessonsApi';
import { useLessons, useMySubjects } from '../api/queries';
import { LessonStateBadge } from '../components/LessonStateBadge';
import { lessonPath, newLessonForPath, teacherHomePath } from '../paths';
import { subjectAppearance } from '../subjectAppearance';

type Filter = 'all' | LessonState;
const FILTERS: readonly Filter[] = ['all', ...LESSON_STATES];
const PAGE_SIZE = 50;

/** All lessons of one subject, which already belongs to exactly one odeljenje. */
export function SubjectLessonsPage() {
  const t = text.teacher.subject;
  const { subjectId = '' } = useParams();
  const subjects = useMySubjects();
  const [filter, setFilter] = useState<Filter>('all');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const lessons = useLessons({
    subjectId,
    status: filter === 'all' ? undefined : filter,
    limit,
  });

  if (subjects.isPending) return <LoadingState label={text.teacher.load.loading} />;
  if (subjects.isError) return <ErrorState onRetry={() => void subjects.refetch()} />;

  const subject = subjects.data.subjects.find((item) => item.id === subjectId);
  if (!subject) {
    return (
      <>
        <title>{text.app.pageTitle(t.notFoundTitle)}</title>
        <MessagePage
          title={t.notFoundTitle}
          description={t.notFoundDescription}
          action={
            <Button asChild variant="outline" size="lg">
              <Link to={teacherHomePath}>{t.back}</Link>
            </Button>
          }
        />
      </>
    );
  }

  const appearance = subjectAppearance(subject.id, subject.name);
  const theme = subjectTheme[appearance.color];
  const total = Object.values(subject.lessonCounts).reduce((sum, count) => sum + count, 0);
  const countOf = (option: Filter) => (option === 'all' ? total : subject.lessonCounts[option]);

  return (
    <>
      <title>
        {text.app.pageTitle(
          `${subject.name} · ${text.teacher.home.classHeading(subject.className)}`,
        )}
      </title>
      <Link
        to={teacherHomePath}
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
              {t.meta(subject.className, subject.studentCount)}
            </p>
          </div>
          <Button asChild size="lg" className="h-12 px-6 text-base">
            <Link to={newLessonForPath(subject.id)}>
              <PlusIcon aria-hidden="true" weight="bold" />
              {text.nav.newLesson}
            </Link>
          </Button>
        </div>
      </header>

      <div role="group" aria-label={t.filterLabel} className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
        {FILTERS.map((option) => {
          const active = filter === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setFilter(option);
                setLimit(PAGE_SIZE);
              }}
              className={cn(
                'relative pb-2 font-display font-medium transition-colors',
                active ? 'text-ink' : 'text-ink-soft hover:text-ink',
              )}
            >
              {option === 'all' ? t.filterAll : text.teacher.states[option]}
              <span className="ml-1.5 text-sm text-ink-soft">{countOf(option)}</span>
              {active && (
                <motion.span
                  layoutId="subject-filter-marker"
                  aria-hidden="true"
                  className="absolute inset-x-0 -bottom-0.5 h-1.5 rounded-full bg-ochre"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {lessons.isPending ? (
        <LoadingState label={text.teacher.load.loading} />
      ) : lessons.isError ? (
        <ErrorState onRetry={() => void lessons.refetch()} />
      ) : total === 0 ? (
        <p className="mt-8 text-lg text-ink-soft">{t.empty}</p>
      ) : lessons.data.lessons.length === 0 ? (
        <p className="mt-8 text-lg text-ink-soft">{t.noMatches}</p>
      ) : (
        <>
          <ul className="mt-6 grid gap-3">
            {lessons.data.lessons.map((lesson) => (
              <li key={lesson.id}>
                <LessonRow lesson={lesson} />
              </li>
            ))}
          </ul>
          {lessons.data.total > lessons.data.lessons.length && (
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setLimit((current) => current + PAGE_SIZE)}
              >
                {t.showMore}
              </Button>
              <span className="text-sm text-ink-soft">
                {t.shown(lessons.data.lessons.length, lessons.data.total)}
              </span>
            </div>
          )}
        </>
      )}
    </>
  );
}

function LessonRow({ lesson }: { lesson: LessonListItem }) {
  return (
    <Link
      to={lessonPath(lesson.id)}
      className="group flex items-center gap-4 rounded-3xl bg-card px-5 py-4 shadow-soft transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lifted"
    >
      {lesson.status === 'processing' && <AiPulse size="sm" />}
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg font-semibold break-words text-ink">
          {lesson.title}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1">
          <LessonStateBadge state={lesson.status} />
          <span className="text-sm text-ink-soft">
            {text.teacher.subject.updated(formatDate(lesson.updatedAt))}
          </span>
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

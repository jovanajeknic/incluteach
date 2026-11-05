import { CaretRightIcon, PlusIcon } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { formatDate } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { AiPulse } from '@/shared/visual/AiPulse';
import { text } from '@/text/sr-Latn';
import {
  LESSON_STATES,
  type LessonListItem,
  type LessonState,
  type TeacherSubject,
} from '../api/lessonsApi';
import { useLessons } from '../api/queries';
import { LessonStateBadge } from '../components/LessonStateBadge';
import { SubjectFrame } from '../components/SubjectFrame';
import { lessonPath, newLessonForPath } from '../paths';

type Filter = 'all' | LessonState;
const FILTERS: readonly Filter[] = ['all', ...LESSON_STATES];
const PAGE_SIZE = 50;

/** All lessons of one subject, which already belongs to exactly one odeljenje. */
export function SubjectLessonsPage() {
  const { subjectId = '' } = useParams();

  return (
    <SubjectFrame
      subjectId={subjectId}
      action={
        <Button asChild size="lg" className="h-12 px-6 text-base">
          <Link to={newLessonForPath(subjectId)}>
            <PlusIcon aria-hidden="true" weight="bold" />
            {text.nav.newLesson}
          </Link>
        </Button>
      }
    >
      {(subject) => (
        <>
          <title>
            {text.app.pageTitle(
              `${subject.name} · ${text.teacher.home.classHeading(subject.className)}`,
            )}
          </title>
          <Lessons subject={subject} />
        </>
      )}
    </SubjectFrame>
  );
}

function Lessons({ subject }: { subject: TeacherSubject }) {
  const t = text.teacher.subject;
  const [filter, setFilter] = useState<Filter>('all');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const lessons = useLessons({
    subjectId: subject.id,
    status: filter === 'all' ? undefined : filter,
    limit,
  });

  const total = Object.values(subject.lessonCounts).reduce((sum, count) => sum + count, 0);
  const countOf = (option: Filter) => (option === 'all' ? total : subject.lessonCounts[option]);

  return (
    <>
      <div role="group" aria-label={t.filterLabel} className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
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

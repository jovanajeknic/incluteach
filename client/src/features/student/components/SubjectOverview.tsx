import { CaretRightIcon, CheckCircleIcon, CircleIcon } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { subjectAppearance } from '@/features/lessons/subjectAppearance';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { cn } from '@/shared/lib/utils';
import { SubjectBlob } from '@/shared/visual/SubjectBlob';
import { subjectTheme } from '@/shared/visual/subjectIcons';
import { text } from '@/text/sr-Latn';
import { useSubjectLessons, useSubjectProgress } from '../api/queries';
import type { Enrollment, LessonListItem } from '../api/studentApi';

const t = text.pupil.subject;

interface SubjectOverviewProps {
  subject: Enrollment['subject'];
  /** A parent looks at one child's subject. */
  studentId?: string;
  /** Where a lesson of this subject opens. */
  lessonPath: (lessonId: string) => string;
}

/** A subject the student joined: who teaches it, how far they got, and its published lessons. */
export function SubjectOverview({ subject, studentId, lessonPath }: SubjectOverviewProps) {
  const lessons = useSubjectLessons(subject.id, studentId);
  const progress = useSubjectProgress(subject.id, studentId);
  const appearance = subjectAppearance(subject.id, subject.name);
  const theme = subjectTheme[appearance.color];
  const doneIds = new Set(
    progress.data?.items.filter((item) => item.completed).map((item) => item.id) ?? [],
  );
  const published = progress.data?.lessons.published ?? 0;
  const done = progress.data?.lessons.completed ?? 0;

  return (
    <>
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
                <LessonRow
                  lesson={lesson}
                  done={doneIds.has(lesson.id)}
                  to={lessonPath(lesson.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function LessonRow({ lesson, done, to }: { lesson: LessonListItem; done: boolean; to: string }) {
  return (
    <Link
      to={to}
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

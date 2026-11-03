import { ArrowLeftIcon, CaretRightIcon, PlusIcon } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { approvalProgress, needsReview, useSchool } from '@/features/school/schoolContext';
import type { SchoolLesson } from '@/features/school/types';
import { AiPulse } from '@/features/teacher-ui/AiPulse';
import { SubjectBlob } from '@/features/teacher-ui/SubjectBlob';
import { subjectTheme } from '@/features/teacher-ui/subjectIcons';
import { MessagePage } from '@/shared/components/MessagePage';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { LessonStatusBadge } from '../components/LessonStatusBadge';
import { coursePath, lessonPath, newLessonForPath, teacherHomePath } from '../paths';

type Filter = keyof typeof text.course.filters;

const filterTest: Record<Filter, (lesson: SchoolLesson) => boolean> = {
  all: () => true,
  review: needsReview,
  published: (lesson) => lesson.status === 'assigned',
  working: (lesson) => lesson.status === 'processing' || lesson.status === 'draft',
};

/** All lessons of one subject in one class. */
export function CoursePage() {
  const t = text.course;
  const { subjectId = '', classId = '' } = useParams();
  const school = useSchool();
  const [filter, setFilter] = useState<Filter>('all');
  const subject = school.getSubject(subjectId);
  const group = school.getClass(classId);
  const teaches = school.data.teacher.teaching.some(
    (item) => item.subjectId === subjectId && item.classId === classId,
  );

  if (!subject || !group || !teaches) {
    return (
      <>
        <title>{text.app.pageTitle(t.notFoundTitle)}</title>
        <MessagePage
          title={t.notFoundTitle}
          description={t.notFoundDescription}
          action={
            <Button asChild variant="outline" size="lg">
              <Link to={teacherHomePath}>{t.backToSubjects}</Link>
            </Button>
          }
        />
      </>
    );
  }

  const theme = subjectTheme[subject.color];
  const lessons = school.data.lessons.filter(
    (lesson) => lesson.subjectId === subjectId && lesson.classId === classId,
  );
  const visible = lessons.filter(filterTest[filter]);
  const otherClasses = school.data.teacher.teaching.filter(
    (item) => item.subjectId === subjectId && item.classId !== classId,
  );

  return (
    <>
      <title>{text.app.pageTitle(text.lesson.courseLabel(subject.name, group.name))}</title>
      <Link
        to={teacherHomePath}
        className="inline-flex items-center gap-1.5 rounded-full font-display font-medium text-ink-soft hover:text-forest"
      >
        <ArrowLeftIcon aria-hidden="true" weight="bold" className="size-4" />
        {t.backToSubjects}
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
          <SubjectBlob subject={subject} size="xl" className="bg-card" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">
              {subject.name}
            </h1>
            <p className={cn('mt-1 font-display text-lg font-medium', theme.ink)}>
              {text.home.classHeading(group.name)} ·{' '}
              {t.studentCount(school.studentsOf(classId).length)}
            </p>
          </div>
          <Button asChild size="lg" className="h-12 px-6 text-base">
            <Link to={newLessonForPath(subjectId, classId)}>
              <PlusIcon aria-hidden="true" weight="bold" />
              {text.nav.newLesson}
            </Link>
          </Button>
        </div>
        {otherClasses.length > 0 && (
          <p className="relative mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink">
            <span>{t.otherClasses}</span>
            {otherClasses.map((item) => (
              <Link
                key={item.classId}
                to={coursePath(subjectId, item.classId)}
                className="font-display font-semibold underline decoration-2 underline-offset-4"
              >
                {school.getClass(item.classId)?.name}
              </Link>
            ))}
          </p>
        )}
      </header>

      <div role="group" aria-label={t.filterLabel} className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
        {(Object.keys(t.filters) as Filter[]).map((option) => {
          const active = filter === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(option)}
              className={cn(
                'relative pb-2 font-display font-medium transition-colors',
                active ? 'text-ink' : 'text-ink-soft hover:text-ink',
              )}
            >
              {t.filters[option]}
              <span className="ml-1.5 text-sm text-ink-soft">
                {lessons.filter(filterTest[option]).length}
              </span>
              {active && (
                <motion.span
                  layoutId="course-filter-marker"
                  aria-hidden="true"
                  className="absolute inset-x-0 -bottom-0.5 h-1.5 rounded-full bg-ochre"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {lessons.length === 0 ? (
        <p className="mt-8 text-lg text-ink-soft">{t.empty}</p>
      ) : visible.length === 0 ? (
        <p className="mt-8 text-lg text-ink-soft">{t.noMatches}</p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {visible.map((lesson, index) => (
            <motion.li
              key={lesson.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.35 }}
            >
              <LessonRow lesson={lesson} />
            </motion.li>
          ))}
        </ul>
      )}
    </>
  );
}

function LessonRow({ lesson }: { lesson: SchoolLesson }) {
  const { approved, total } = approvalProgress(lesson);
  const working = lesson.status === 'processing';
  return (
    <Link
      to={lessonPath(lesson.id)}
      className="group flex items-center gap-4 rounded-3xl bg-card px-5 py-4 shadow-soft transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lifted"
    >
      {working && <AiPulse size="sm" />}
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg font-semibold break-words text-ink">
          {lesson.title}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1">
          <LessonStatusBadge status={lesson.status} />
          {lesson.status !== 'draft' && !working && (
            <span className="text-sm text-ink-soft">
              {text.course.approvedCount(approved, total)}
            </span>
          )}
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

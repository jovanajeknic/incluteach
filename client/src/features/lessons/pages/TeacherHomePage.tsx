import { ArrowRightIcon, EyeIcon, PlusIcon } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router';
import { needsReview, useSchool } from '@/features/school/schoolContext';
import { teacherClassIds, type SchoolLesson } from '@/features/school/types';
import type { Subject } from '@/features/student/types';
import { itemMotion, listMotion } from '@/shared/motion/listMotion';
import { SubjectCard } from '@/shared/visual/SubjectCard';
import { subjectTheme } from '@/shared/visual/subjectIcons';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { coursePath, lessonPath, newLessonPath } from '../paths';

type View = 'subject' | 'class';

const VIEW_KEY = 'incluteach.teacher.subjectsView';

function readSavedView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'class' ? 'class' : 'subject';
  } catch {
    return 'subject';
  }
}

export function TeacherHomePage() {
  const t = text.home;
  const school = useSchool();
  const { data } = school;
  const [view, setView] = useState<View>(readSavedView);

  function chooseView(next: View) {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Remembering the choice is only a convenience.
    }
  }

  const lessonsOf = (subjectId: string, classId: string) =>
    data.lessons.filter((lesson) => lesson.subjectId === subjectId && lesson.classId === classId);
  const toReview = data.lessons.filter(needsReview);

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">{t.heading}</h1>
        <Button asChild size="lg" className="h-12 px-6 text-base">
          <Link to={newLessonPath}>
            <PlusIcon aria-hidden="true" weight="bold" />
            {text.nav.newLesson}
          </Link>
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <ViewSwitch view={view} onChange={chooseView} />
        {toReview.length > 0 && <ReviewLine lessons={toReview} />}
      </div>

      {data.teacher.teaching.length === 0 ? (
        <p className="mt-10 text-lg text-ink-soft">{t.noSubjects}</p>
      ) : view === 'subject' ? (
        <BySubject lessonsOf={lessonsOf} />
      ) : (
        <ByClass lessonsOf={lessonsOf} />
      )}
    </>
  );
}

/** Two options with a sliding marker under the chosen one. */
function ViewSwitch({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const t = text.home;
  const options: { value: View; label: string }[] = [
    { value: 'subject', label: t.bySubject },
    { value: 'class', label: t.byClass },
  ];
  return (
    <div role="group" aria-label={t.viewLabel} className="flex gap-6">
      {options.map((option) => {
        const active = view === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative pb-2 font-display text-lg font-medium transition-colors',
              active ? 'text-ink' : 'text-ink-soft hover:text-ink',
            )}
          >
            {option.label}
            {active && (
              <motion.span
                layoutId="view-switch-marker"
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-0.5 h-1.5 rounded-full bg-ochre"
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** A quiet line, not a banner: lessons where finished AI work waits for the teacher. */
function ReviewLine({ lessons }: { lessons: SchoolLesson[] }) {
  return (
    <section aria-labelledby="review-heading" className="flex min-w-0 items-center gap-2 text-sm">
      <h2
        id="review-heading"
        className="flex shrink-0 items-center gap-1.5 font-medium text-butter-ink"
      >
        <EyeIcon aria-hidden="true" weight="duotone" className="size-5" />
        {text.home.reviewLabel}:
      </h2>
      <ul className="flex min-w-0 flex-wrap gap-x-3 gap-y-1">
        {lessons.map((lesson) => (
          <li key={lesson.id}>
            <Link
              to={lessonPath(lesson.id)}
              className="text-ink underline decoration-butter-deep decoration-2 underline-offset-4 hover:decoration-butter-ink"
            >
              {lesson.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

type LessonsOf = (subjectId: string, classId: string) => SchoolLesson[];

function BySubject({ lessonsOf }: { lessonsOf: LessonsOf }) {
  const school = useSchool();
  const teaching = school.data.teacher.teaching;
  const subjectIds = [...new Set(teaching.map((item) => item.subjectId))];

  return (
    <motion.ul
      variants={listMotion}
      initial="hidden"
      animate="show"
      className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
    >
      {subjectIds.map((subjectId) => {
        const subject = school.getSubject(subjectId);
        if (!subject) return null;
        const classIds = teaching
          .filter((item) => item.subjectId === subjectId)
          .map((item) => item.classId);
        return (
          <motion.li key={subjectId} variants={itemMotion}>
            <SubjectCard subject={subject}>
              <ul className="mt-5 grid gap-2">
                {classIds.map((classId) => {
                  const group = school.getClass(classId);
                  if (!group) return null;
                  return (
                    <li key={classId}>
                      <CourseLink
                        subject={subject}
                        classId={classId}
                        label={text.home.classHeading(group.name)}
                        count={lessonsOf(subjectId, classId).length}
                      />
                    </li>
                  );
                })}
              </ul>
            </SubjectCard>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}

function ByClass({ lessonsOf }: { lessonsOf: LessonsOf }) {
  const school = useSchool();
  const teaching = school.data.teacher.teaching;

  return (
    <div className="mt-8 grid gap-12">
      {teacherClassIds(school.data.teacher).map((classId) => {
        const group = school.getClass(classId);
        if (!group) return null;
        const subjects = teaching
          .filter((item) => item.classId === classId)
          .flatMap((item) => school.getSubject(item.subjectId) ?? []);
        return (
          <section key={classId} aria-labelledby={`class-${classId}`}>
            <h2 id={`class-${classId}`} className="font-display text-2xl font-semibold text-ink">
              {text.home.classHeading(group.name)}
            </h2>
            <motion.ul
              variants={listMotion}
              initial="hidden"
              animate="show"
              className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
            >
              {subjects.map((subject) => (
                <motion.li key={subject.id} variants={itemMotion}>
                  <SubjectCard subject={subject}>
                    <div className="mt-5">
                      <CourseLink
                        subject={subject}
                        classId={classId}
                        label={text.lesson.courseLabel(subject.name, group.name)}
                        count={lessonsOf(subject.id, classId).length}
                        hideLabel
                      />
                    </div>
                  </SubjectCard>
                </motion.li>
              ))}
            </motion.ul>
          </section>
        );
      })}
    </div>
  );
}

function CourseLink({
  subject,
  classId,
  label,
  count,
  hideLabel = false,
}: {
  subject: Subject;
  classId: string;
  label: string;
  count: number;
  /** In the by-class view the class is already the section heading. */
  hideLabel?: boolean;
}) {
  const theme = subjectTheme[subject.color];
  return (
    <Link
      to={coursePath(subject.id, classId)}
      className="flex items-center justify-between gap-3 rounded-2xl bg-card/80 px-4 py-3 transition-colors hover:bg-card"
    >
      <span className="min-w-0">
        <span className={cn('block font-display font-semibold text-ink', hideLabel && 'sr-only')}>
          {label}
        </span>
        <span className={cn('block text-sm font-medium', theme.ink)}>
          {text.home.lessonCount(count)}
        </span>
      </span>
      <ArrowRightIcon
        aria-hidden="true"
        weight="bold"
        className={cn('size-5 shrink-0 transition-transform group-hover:translate-x-1', theme.ink)}
      />
    </Link>
  );
}

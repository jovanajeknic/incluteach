import { ArrowRightIcon, PlusIcon } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { cn } from '@/shared/lib/utils';
import { itemMotion, listMotion } from '@/shared/motion/listMotion';
import { Button } from '@/shared/ui/button';
import { SubjectCard } from '@/shared/visual/SubjectCard';
import { subjectTheme } from '@/shared/visual/subjectIcons';
import { text } from '@/text/sr-Latn';
import type { TeacherSubject } from '../api/lessonsApi';
import { useMySubjects } from '../api/queries';
import { newLessonPath, subjectLessonsPath } from '../paths';
import { subjectAppearance } from '../subjectAppearance';

type View = 'subject' | 'class';

const VIEW_KEY = 'incluteach.teacher.subjectsView';

function readSavedView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'class' ? 'class' : 'subject';
  } catch {
    return 'subject';
  }
}

/** "Moji predmeti": the subjects the teacher teaches this school year, from the server. */
export function TeacherHomePage() {
  const t = text.teacher.home;
  const subjects = useMySubjects();
  const [view, setView] = useState<View>(readSavedView);

  function chooseView(next: View) {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Remembering the choice is only a convenience.
    }
  }

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

      {subjects.isPending ? (
        <LoadingState label={text.teacher.load.loading} />
      ) : subjects.isError ? (
        <ErrorState onRetry={() => void subjects.refetch()} />
      ) : subjects.data.subjects.length === 0 ? (
        <p className="mt-10 text-lg text-ink-soft">{t.noSubjects}</p>
      ) : (
        <>
          <div className="mt-6">
            <ViewSwitch view={view} onChange={chooseView} />
          </div>
          {view === 'subject' ? (
            <BySubject subjects={subjects.data.subjects} />
          ) : (
            <ByClass subjects={subjects.data.subjects} />
          )}
        </>
      )}
    </>
  );
}

/** Two options with a sliding marker under the chosen one. */
function ViewSwitch({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const t = text.teacher.home;
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

/** Subjects that share a name (Matematika in 5-1 and 5-2) become one card with a row each. */
function BySubject({ subjects }: { subjects: TeacherSubject[] }) {
  const groups = new Map<string, TeacherSubject[]>();
  for (const subject of subjects) {
    const key = subject.name.toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), subject]);
  }

  return (
    <motion.ul
      variants={listMotion}
      initial="hidden"
      animate="show"
      className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
    >
      {[...groups.values()].map((group) => {
        const first = group[0]!;
        return (
          <motion.li key={first.id} variants={itemMotion}>
            <SubjectCard subject={subjectAppearance(first.id, first.name)}>
              <ul className="mt-5 grid gap-2">
                {group.map((subject) => (
                  <li key={subject.id}>
                    <SubjectLink
                      subject={subject}
                      label={text.teacher.home.classHeading(subject.className)}
                    />
                  </li>
                ))}
              </ul>
            </SubjectCard>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}

function ByClass({ subjects }: { subjects: TeacherSubject[] }) {
  const classes = new Map<string, TeacherSubject[]>();
  for (const subject of subjects) {
    classes.set(subject.classId, [...(classes.get(subject.classId) ?? []), subject]);
  }

  return (
    <div className="mt-8 grid gap-12">
      {[...classes.entries()].map(([classId, inClass]) => (
        <section key={classId} aria-labelledby={`class-${classId}`}>
          <h2 id={`class-${classId}`} className="font-display text-2xl font-semibold text-ink">
            {text.teacher.home.classHeading(inClass[0]!.className)}
          </h2>
          <motion.ul
            variants={listMotion}
            initial="hidden"
            animate="show"
            className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
          >
            {inClass.map((subject) => (
              <motion.li key={subject.id} variants={itemMotion}>
                <SubjectCard subject={subjectAppearance(subject.id, subject.name)}>
                  <div className="mt-5">
                    <SubjectLink subject={subject} label={subject.name} hideLabel />
                  </div>
                </SubjectCard>
              </motion.li>
            ))}
          </motion.ul>
        </section>
      ))}
    </div>
  );
}

function SubjectLink({
  subject,
  label,
  hideLabel = false,
}: {
  subject: TeacherSubject;
  label: string;
  /** In the by-class view the subject is already the card's heading. */
  hideLabel?: boolean;
}) {
  const t = text.teacher.home;
  const theme = subjectTheme[subjectAppearance(subject.id, subject.name).color];
  const total = Object.values(subject.lessonCounts).reduce((sum, count) => sum + count, 0);
  const waiting = subject.lessonCounts.in_review;

  return (
    <Link
      to={subjectLessonsPath(subject.id)}
      className="flex items-center justify-between gap-3 rounded-2xl bg-card/80 px-4 py-3 transition-colors hover:bg-card"
    >
      <span className="min-w-0">
        <span className={cn('block font-display font-semibold text-ink', hideLabel && 'sr-only')}>
          {label}
        </span>
        {hideLabel && (
          <span className="sr-only">
            {text.teacher.home.classHeading(subject.className)}
            {', '}
          </span>
        )}
        <span className={cn('block text-sm font-medium', theme.ink)}>
          {t.lessonCount(total)} · {t.studentCount(subject.studentCount)}
        </span>
        {waiting > 0 && (
          <span className="block text-sm font-medium text-butter-ink">
            {t.waitingForReview(waiting)}
          </span>
        )}
      </span>
      <ArrowRightIcon
        aria-hidden="true"
        weight="bold"
        className={cn('size-5 shrink-0', theme.ink)}
      />
    </Link>
  );
}

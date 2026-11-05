import { ArrowLeftIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { MessagePage } from '@/shared/components/MessagePage';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { SubjectBlob } from '@/shared/visual/SubjectBlob';
import { subjectTheme } from '@/shared/visual/subjectIcons';
import { text } from '@/text/sr-Latn';
import type { TeacherSubject } from '../api/lessonsApi';
import { useMySubjects } from '../api/queries';
import { subjectLessonsPath, subjectStudentsPath, teacherHomePath } from '../paths';
import { subjectAppearance } from '../subjectAppearance';

interface SubjectFrameProps {
  subjectId: string;
  /** A button next to the name, for example "Dodaj lekciju". */
  action?: ReactNode;
  children: (subject: TeacherSubject, allSubjects: TeacherSubject[]) => ReactNode;
}

/**
 * What the pages of one subject share: finding the subject among the teacher's own, the
 * header with its name and odeljenje, and the tabs "Lekcije" and "Učenici". A subject that
 * is not the teacher's looks like one that does not exist.
 */
export function SubjectFrame({ subjectId, action, children }: SubjectFrameProps) {
  const t = text.teacher.subject;
  const subjects = useMySubjects();

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

  return (
    <>
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
          {action}
        </div>
      </header>

      <nav aria-label={text.teacher.students.tabsLabel} className="mt-8 flex gap-6">
        {[
          {
            to: subjectLessonsPath(subject.id),
            label: text.teacher.students.tabLessons,
            end: true,
          },
          {
            to: subjectStudentsPath(subject.id),
            label: text.teacher.students.tabStudents,
            end: false,
          },
        ].map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'border-b-4 pb-2 font-display text-lg font-medium transition-colors',
                isActive
                  ? 'border-ochre text-ink'
                  : 'border-transparent text-ink-soft hover:text-ink',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      {children(subject, subjects.data.subjects)}
    </>
  );
}

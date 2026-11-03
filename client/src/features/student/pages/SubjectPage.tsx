import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { EmptyState } from '@/shared/components/EmptyState';
import { MessagePage } from '@/shared/components/MessagePage';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { ProgressBadge } from '../components/ProgressBadge';
import { useStudent } from '../data/studentContext';
import { studentHomePath, studentLessonPath } from '../paths';
import { subjectColorClasses, subjectIcons } from '../subjectStyles';

export function SubjectPage() {
  const t = text.student.subject;
  const { subjectId = '' } = useParams();
  const { getSubject, lessonsForSubject, progressOf } = useStudent();
  const subject = getSubject(subjectId);

  if (!subject) {
    return (
      <>
        <title>{text.app.pageTitle(t.notFoundTitle)}</title>
        <MessagePage
          title={t.notFoundTitle}
          description={t.notFoundDescription}
          action={
            <Button asChild variant="outline" size="lg">
              <Link to={studentHomePath}>{t.backToSubjects}</Link>
            </Button>
          }
        />
      </>
    );
  }

  const Icon = subjectIcons[subject.icon];
  const colors = subjectColorClasses[subject.color];
  const lessons = lessonsForSubject(subject.id);

  return (
    <>
      <title>{text.app.pageTitle(subject.name)}</title>
      <Link
        to={studentHomePath}
        className="inline-flex items-center gap-2 rounded-full font-display font-medium text-forest hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-5" />
        {t.backToSubjects}
      </Link>

      <div className={cn('mt-6 flex items-center gap-4 rounded-3xl p-6 sm:p-8', colors.surface)}>
        <span
          aria-hidden="true"
          className={cn(
            'flex size-16 shrink-0 items-center justify-center rounded-2xl bg-card shadow-soft',
            colors.ink,
          )}
        >
          <Icon className="size-8" />
        </span>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {subject.name}
        </h1>
      </div>

      <section aria-labelledby="lessons-heading" className="mt-8">
        <h2 id="lessons-heading" className="font-display text-xl font-bold text-ink">
          {t.lessonsHeading}
        </h2>
        {lessons.length === 0 ? (
          <div className="mt-4">
            <EmptyState title={t.empty} />
          </div>
        ) : (
          <ol className="mt-4 grid gap-3">
            {lessons.map((lesson, index) => (
              <li key={lesson.id}>
                <Link
                  to={studentLessonPath(lesson.id)}
                  className="group flex items-center gap-4 rounded-3xl border border-border bg-card p-4 shadow-soft transition-transform duration-200 hover:-translate-y-0.5 sm:p-5"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-11 shrink-0 items-center justify-center rounded-full font-display text-lg font-bold',
                      colors.surface,
                      colors.ink,
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 font-display text-lg font-medium text-ink">
                    {lesson.title}
                  </span>
                  <ProgressBadge progress={progressOf(lesson.id)} />
                  <ChevronRight
                    aria-hidden="true"
                    className="hidden size-5 shrink-0 text-ink-soft sm:block"
                  />
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

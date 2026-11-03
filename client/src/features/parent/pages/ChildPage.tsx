import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { ProgressBadge } from '@/features/student/components/ProgressBadge';
import { subjectColorClasses, subjectIcons } from '@/features/student/subjectStyles';
import { cn } from '@/shared/lib/utils';
import { text } from '@/text/sr-Latn';
import { ForbiddenChild } from '../components/ForbiddenChild';
import { SuggestionsPanel } from '../components/SuggestionsPanel';
import { useParent } from '../data/parentContext';
import { childLessonPath, parentHomePath } from '../paths';

export function ChildPage() {
  const t = text.parent.child;
  const { childId = '' } = useParams();
  const { getChild, subjects: allSubjects } = useParent();
  const child = getChild(childId);

  if (!child) return <ForbiddenChild />;

  const { firstName, lastName, id } = child.profile;
  // Only subjects in which this child has lessons are listed.
  const subjects = allSubjects
    .map((subject) => ({
      subject,
      lessons: child.lessons.filter((lesson) => lesson.subjectId === subject.id),
    }))
    .filter((entry) => entry.lessons.length > 0);

  return (
    <>
      <title>{text.app.pageTitle(`${firstName} ${lastName}`)}</title>
      <Link
        to={parentHomePath}
        className="inline-flex items-center gap-2 rounded-full font-display font-medium text-forest hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-5" />
        {t.backToChildren}
      </Link>
      <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        {firstName} {lastName}
      </h1>

      <section aria-labelledby="child-lessons-heading" className="mt-8">
        <h2 id="child-lessons-heading" className="font-display text-xl font-bold text-ink">
          {t.lessonsHeading}
        </h2>
        <div className="mt-4 grid gap-6">
          {subjects.map(({ subject, lessons }) => {
            const Icon = subjectIcons[subject.icon];
            const colors = subjectColorClasses[subject.color];
            return (
              <div key={subject.id} className={cn('rounded-3xl p-5 sm:p-6', colors.surface)}>
                <h3 className="flex items-center gap-3 font-display text-lg font-bold text-ink">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-10 items-center justify-center rounded-xl bg-card',
                      colors.ink,
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  {subject.name}
                </h3>
                <ul className="mt-4 grid gap-2">
                  {lessons.map((lesson) => (
                    <li key={lesson.id}>
                      <Link
                        to={childLessonPath(id, lesson.id)}
                        className="group flex items-center gap-3 rounded-2xl bg-card p-4 transition-transform duration-200 hover:-translate-y-0.5"
                      >
                        <span className="min-w-0 flex-1 font-display font-medium text-ink">
                          {lesson.title}
                        </span>
                        <ProgressBadge progress={child.progressOf(lesson.id)} />
                        <ChevronRight
                          aria-hidden="true"
                          className="hidden size-5 shrink-0 text-ink-soft sm:block"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-10">
        <SuggestionsPanel child={child} />
      </div>
    </>
  );
}

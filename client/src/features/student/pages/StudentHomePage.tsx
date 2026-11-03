import { ChevronRight, Star } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/shared/lib/utils';
import { text } from '@/text/sr-Latn';
import { useStudent } from '../data/studentContext';
import { subjectPath } from '../paths';
import { subjectColorClasses, subjectIcons } from '../subjectStyles';

export function StudentHomePage() {
  const t = text.student.home;
  const { profile, subjects, lessonsForSubject, stars } = useStudent();

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {t.greeting(profile.firstName)}
          </h1>
          <p className="mt-2 text-lg text-ink-soft">{t.intro}</p>
        </div>
        <div className="flex items-center gap-3 rounded-3xl bg-butter px-5 py-3">
          <Star aria-hidden="true" className="size-7 fill-butter-deep text-butter-ink" />
          <div>
            <p className="font-display text-sm text-butter-ink">{t.starsLabel}</p>
            <p className="font-display text-2xl leading-none font-bold text-ink">{stars}</p>
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm text-ink-soft sm:text-right">{t.starsHint}</p>

      <section aria-labelledby="subjects-heading" className="mt-10">
        <h2 id="subjects-heading" className="sr-only">
          {t.subjectsHeading}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => {
            const Icon = subjectIcons[subject.icon];
            const colors = subjectColorClasses[subject.color];
            const count = lessonsForSubject(subject.id).length;
            return (
              <li key={subject.id}>
                <Link
                  to={subjectPath(subject.id)}
                  className={cn(
                    'group flex h-full items-center gap-4 rounded-3xl p-5 transition-transform duration-200 hover:-translate-y-1 sm:p-6',
                    colors.surface,
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-14 shrink-0 items-center justify-center rounded-2xl bg-card shadow-soft',
                      colors.ink,
                    )}
                  >
                    <Icon className="size-7" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-xl font-bold text-ink">
                      {subject.name}
                    </span>
                    <span className={cn('block font-display text-sm', colors.ink)}>
                      {t.lessonCount(count)}
                    </span>
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-6 shrink-0 text-ink-soft transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

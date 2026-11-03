import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { initialsOf } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { text } from '@/text/sr-Latn';
import { useParent } from '../data/parentContext';
import { childPath } from '../paths';
import type { ChildData } from '../types';

// Each child gets their own soft colour, so siblings are easy to tell apart.
const childColors = [
  'bg-sky text-sky-ink',
  'bg-blush text-blush-ink',
  'bg-pistachio text-pistachio-ink',
];

function countByProgress(child: ChildData) {
  let started = 0;
  let completed = 0;
  for (const lesson of child.lessons) {
    const progress = child.progressOf(lesson.id);
    if (progress === 'started') started += 1;
    if (progress === 'completed') completed += 1;
  }
  return { started, completed };
}

export function ParentHomePage() {
  const t = text.parent.home;
  const { parent, children } = useParent();

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        {t.greeting(parent.firstName)}
      </h1>
      <p className="mt-2 max-w-2xl text-lg text-ink-soft">{t.intro}</p>

      <section aria-labelledby="children-heading" className="mt-10">
        <h2 id="children-heading" className="font-display text-xl font-bold text-ink">
          {t.childrenHeading}
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {children.map((child, index) => {
            const { started, completed } = countByProgress(child);
            const { firstName, lastName, id } = child.profile;
            return (
              <li key={id}>
                <Link
                  to={childPath(id)}
                  className="group flex items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-soft transition-transform duration-200 hover:-translate-y-1 sm:p-6"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-14 shrink-0 items-center justify-center rounded-full font-display text-lg font-bold',
                      childColors[index % childColors.length],
                    )}
                  >
                    {initialsOf(firstName, lastName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-xl font-bold text-ink">
                      {firstName} {lastName}
                    </span>
                    <span className="block text-sm text-ink-soft">
                      {t.lessonsSummary(started, completed)}
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

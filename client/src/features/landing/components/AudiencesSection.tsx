import {
  ArrowRightIcon,
  ChalkboardTeacherIcon,
  StudentIcon,
  UsersThreeIcon,
  type Icon,
} from '@phosphor-icons/react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { teacherHomePath } from '@/features/lessons/paths';
import { parentHomePath } from '@/features/parent/paths';
import { studentHomePath } from '@/features/student/paths';
import { cn } from '@/shared/lib/utils';
import { blobShape } from '@/shared/visual/subjectIcons';
import { text } from '@/text/sr-Latn';
import { sectionIds } from '../sections';

interface Audience {
  key: 'teacher' | 'student' | 'parent';
  icon: Icon;
  /** Card surface, the deeper circle and the icon blob. */
  surface: string;
  deep: string;
  blob: string;
  demoPath: string;
}

const audiences: Audience[] = [
  {
    key: 'teacher',
    icon: ChalkboardTeacherIcon,
    surface: 'bg-butter',
    deep: 'bg-butter-deep',
    blob: 'text-butter-ink',
    demoPath: teacherHomePath,
  },
  {
    key: 'student',
    icon: StudentIcon,
    surface: 'bg-sky',
    deep: 'bg-sky-deep',
    blob: 'text-sky-ink',
    demoPath: studentHomePath,
  },
  {
    key: 'parent',
    icon: UsersThreeIcon,
    surface: 'bg-blush',
    deep: 'bg-blush-deep',
    blob: 'text-blush-ink',
    demoPath: parentHomePath,
  },
];

export function AudiencesSection() {
  const t = text.landing.audiences;
  const headingId = `${sectionIds.audiences}-heading`;

  return (
    <section id={sectionIds.audiences} aria-labelledby={headingId}>
      <div className="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6 lg:px-8">
        <h2
          id={headingId}
          data-reveal=""
          className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
        >
          {t.title}
        </h2>
        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {audiences.map(({ key, icon: AudienceIcon, surface, deep, blob, demoPath }, index) => (
            <li
              key={key}
              data-reveal="pop"
              style={{ '--reveal-order': index } as CSSProperties}
              className={cn(
                'group relative flex flex-col overflow-hidden rounded-[2rem] p-7 transition-transform duration-300 ease-bounce hover:-translate-y-1',
                surface,
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'absolute -top-12 -right-12 size-40 rounded-full opacity-50 transition-transform duration-500 group-hover:scale-110',
                  deep,
                )}
              />
              <span
                aria-hidden="true"
                className={cn(
                  'relative flex size-16 items-center justify-center bg-card',
                  blobShape,
                  blob,
                )}
              >
                <AudienceIcon weight="duotone" className="size-9" />
              </span>
              <h3 className="relative mt-5 font-display text-2xl font-semibold text-ink">
                {t[key].title}
              </h3>
              <p className="relative mt-2 flex-1 text-ink">{t[key].description}</p>
              <Link
                to={demoPath}
                className="relative mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-card px-5 py-2.5 font-display font-medium text-forest shadow-soft transition-transform hover:-translate-y-0.5"
              >
                {t.demoLinks[key]}
                <ArrowRightIcon
                  aria-hidden="true"
                  weight="bold"
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

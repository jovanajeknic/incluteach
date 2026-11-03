import type { CSSProperties, ReactNode } from 'react';
import { text } from '@/text/sr-Latn';
import { sectionIds } from '../sections';
import { ParentIcon, StudentIcon, TeacherIcon } from './RoleIcons';

interface Audience {
  key: 'teacher' | 'student' | 'parent';
  icon: ReactNode;
  /** Only the teacher part exists in the demo; the others are still being built. */
  comingSoon: boolean;
}

const audiences: Audience[] = [
  { key: 'teacher', icon: <TeacherIcon />, comingSoon: false },
  { key: 'student', icon: <StudentIcon />, comingSoon: true },
  { key: 'parent', icon: <ParentIcon />, comingSoon: true },
];

export function AudiencesSection() {
  const t = text.landing.audiences;
  const headingId = `${sectionIds.audiences}-heading`;

  return (
    <section id={sectionIds.audiences} aria-labelledby={headingId}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="border-t border-line pt-12 pb-16 sm:pt-14">
          <h2
            id={headingId}
            data-reveal=""
            className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl"
          >
            {t.title}
          </h2>
          <ul className="mt-10 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {audiences.map(({ key, icon, comingSoon }, index) => (
              <li
                key={key}
                data-reveal=""
                style={{ '--reveal-order': index } as CSSProperties}
                className="flex gap-4"
              >
                {icon}
                <div>
                  <h3 className="font-display text-xl font-bold text-ink">{t[key].title}</h3>
                  <p className="mt-2 text-ink-soft">{t[key].description}</p>
                  {comingSoon && (
                    <p className="mt-2 font-display text-sm font-medium text-sage">
                      {t.comingSoon}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

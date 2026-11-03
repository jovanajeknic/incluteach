import { ArrowRight } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import { teacherHomePath } from '@/features/lessons/paths';
import { studentHomePath } from '@/features/student/paths';
import { text } from '@/text/sr-Latn';
import { sectionIds } from '../sections';
import { ParentIcon, StudentIcon, TeacherIcon } from './RoleIcons';

interface Audience {
  key: 'teacher' | 'student' | 'parent';
  icon: ReactNode;
  /** Where the demo for this role lives; without one, the role is marked as coming soon. */
  demoPath?: string;
}

const audiences: Audience[] = [
  { key: 'teacher', icon: <TeacherIcon />, demoPath: teacherHomePath },
  { key: 'student', icon: <StudentIcon />, demoPath: studentHomePath },
  { key: 'parent', icon: <ParentIcon /> },
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
            {audiences.map(({ key, icon, demoPath }, index) => (
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
                  {demoPath ? (
                    <Link
                      to={demoPath}
                      className="group mt-3 inline-flex items-center gap-1.5 rounded-full font-display font-medium text-forest hover:underline"
                    >
                      {t.demoLinks[key as 'teacher' | 'student']}
                      <ArrowRight
                        aria-hidden="true"
                        className="size-4 transition-transform group-hover:translate-x-0.5"
                      />
                    </Link>
                  ) : (
                    <p className="mt-2 font-display text-sm font-medium text-ink-soft">
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

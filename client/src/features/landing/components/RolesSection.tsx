import { BookOpenText, HeartHandshake, Smile, type LucideIcon } from 'lucide-react';
import type { CSSProperties } from 'react';
import { cn } from '@/shared/lib/utils';
import { text } from '@/text/sr-Latn';
import { AvailabilityBadge } from './AvailabilityBadge';

interface Role {
  key: 'teacher' | 'student' | 'parent';
  icon: LucideIcon;
  surface: string;
  bubble: string;
  availability: 'inDemo' | 'comingSoon';
}

// One pastel per role; only the teacher part exists in the demo so far.
const roles: Role[] = [
  {
    key: 'teacher',
    icon: BookOpenText,
    surface: 'bg-mint',
    bubble: 'text-mint-ink',
    availability: 'inDemo',
  },
  {
    key: 'student',
    icon: Smile,
    surface: 'bg-sky',
    bubble: 'text-sky-ink',
    availability: 'comingSoon',
  },
  {
    key: 'parent',
    icon: HeartHandshake,
    surface: 'bg-butter',
    bubble: 'text-butter-ink',
    availability: 'comingSoon',
  },
];

export function RolesSection() {
  const t = text.landing.roles;

  return (
    <section aria-labelledby="roles-heading" className="pt-6 pb-20 sm:pb-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2
          id="roles-heading"
          data-reveal=""
          className="text-center font-display text-3xl font-black tracking-tight text-ink sm:text-4xl"
        >
          {t.heading}
        </h2>
        <ul className="mt-10 grid gap-5 sm:grid-cols-3">
          {roles.map(({ key, icon: Icon, surface, bubble, availability }, index) => (
            <li
              key={key}
              data-reveal="pop"
              style={{ '--reveal-order': index } as CSSProperties}
              className={cn('flex flex-col items-start rounded-[2rem] p-6 sm:p-7', surface)}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'hover-hop flex size-14 items-center justify-center rounded-2xl bg-card shadow-soft',
                  bubble,
                )}
              >
                <Icon className="size-7" />
              </span>
              <h3 className="mt-5 font-display text-2xl font-black text-ink">{t[key].title}</h3>
              <p className="mt-1 mb-5 flex-1 text-lg text-ink">{t[key].description}</p>
              <AvailabilityBadge availability={availability} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

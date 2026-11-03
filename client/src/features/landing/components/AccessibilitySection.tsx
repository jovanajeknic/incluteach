import {
  CheckCircle2,
  CircleDashed,
  Layers,
  ShieldCheck,
  SlidersHorizontal,
  TextQuote,
  type LucideIcon,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { cn } from '@/shared/lib/utils';
import { text } from '@/text/sr-Latn';
import { sectionIds } from '../sections';
import { SectionHeading } from './SectionHeading';
import { Wave } from './Wave';

const principleStyles: { icon: LucideIcon; bubble: string }[] = [
  { icon: TextQuote, bubble: 'bg-mint text-mint-ink' },
  { icon: SlidersHorizontal, bubble: 'bg-butter text-butter-ink' },
  { icon: Layers, bubble: 'bg-sky text-sky-ink' },
  { icon: ShieldCheck, bubble: 'bg-blush text-blush-ink' },
];

export function AccessibilitySection() {
  const t = text.landing.accessibility;
  const headingId = `${sectionIds.accessibility}-heading`;

  return (
    <section id={sectionIds.accessibility} aria-labelledby={headingId}>
      <Wave className="text-lilac" />
      <div className="bg-lilac">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-10 pb-20 sm:px-6 sm:pb-28 lg:grid-cols-[1.15fr_1fr] lg:gap-14 lg:px-8">
          <div>
            <SectionHeading id={headingId} eyebrow={t.eyebrow} title={t.title} intro={t.intro} />
            <ul className="mt-10 grid gap-4 sm:grid-cols-2">
              {t.principles.map((principle, index) => {
                const { icon: Icon, bubble } = principleStyles[index] ?? principleStyles[0]!;
                return (
                  <li
                    key={principle.title}
                    data-reveal="pop"
                    style={{ '--reveal-order': index } as CSSProperties}
                    className="rounded-3xl bg-card p-5 shadow-soft"
                  >
                    <span
                      aria-hidden="true"
                      className={cn('flex size-11 items-center justify-center rounded-2xl', bubble)}
                    >
                      <Icon className="size-6" />
                    </span>
                    <h3 className="mt-4 font-display text-lg font-extrabold text-ink">
                      {principle.title}
                    </h3>
                    <p className="mt-1 text-ink-soft">{principle.description}</p>
                  </li>
                );
              })}
            </ul>
          </div>

          <div
            data-reveal="right"
            className="self-start rounded-[2.5rem] bg-card p-7 shadow-lifted sm:p-9"
          >
            <h3 className="flex items-center gap-2 font-display text-xl font-extrabold text-ink">
              <CheckCircle2 aria-hidden="true" className="size-6 text-mint-ink" />
              {t.availableTitle}
            </h3>
            <ul className="mt-4 space-y-3">
              {t.available.map((item) => (
                <li key={item} className="flex gap-3 text-ink">
                  <span
                    aria-hidden="true"
                    className="mt-2 size-2.5 shrink-0 rounded-full bg-mint-deep"
                  />
                  {item}
                </li>
              ))}
            </ul>

            <div className="my-7 border-t-2 border-dashed border-lilac" />

            <h3 className="flex items-center gap-2 font-display text-xl font-extrabold text-ink">
              <CircleDashed aria-hidden="true" className="size-6 text-lilac-ink" />
              {t.plannedTitle}
            </h3>
            <ul className="mt-4 space-y-3">
              {t.planned.map((item) => (
                <li key={item} className="flex gap-3 text-ink-soft">
                  <span
                    aria-hidden="true"
                    className="mt-2 size-2.5 shrink-0 rounded-full border-2 border-lilac-ink"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

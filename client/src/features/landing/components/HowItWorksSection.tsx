import { BookOpenText, Info, Sparkles, Users, type LucideIcon } from 'lucide-react';
import type { CSSProperties } from 'react';
import { cn } from '@/shared/lib/utils';
import { text } from '@/text/sr-Latn';
import { sectionIds } from '../sections';
import { SectionHeading } from './SectionHeading';
import { Wave } from './Wave';

// Each step gets its own pastel, so the three stages read as one path with distinct stops.
const stepStyles: { icon: LucideIcon; bubble: string; tag: string }[] = [
  { icon: BookOpenText, bubble: 'bg-mint-deep', tag: 'bg-mint text-mint-ink' },
  { icon: Sparkles, bubble: 'bg-butter-deep', tag: 'bg-butter text-butter-ink' },
  { icon: Users, bubble: 'bg-lilac-deep', tag: 'bg-lilac text-lilac-ink' },
];

export function HowItWorksSection() {
  const t = text.landing.howItWorks;
  const headingId = `${sectionIds.howItWorks}-heading`;

  return (
    <section id={sectionIds.howItWorks} aria-labelledby={headingId} className="bg-blush">
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading id={headingId} eyebrow={t.eyebrow} title={t.title} />
          <p
            data-reveal="right"
            className="flex max-w-md items-start gap-3 rounded-3xl bg-card px-5 py-4 text-ink shadow-soft"
          >
            <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-blush-ink" />
            {t.plannedNote}
          </p>
        </div>

        <ol className="mt-14 grid gap-6 lg:grid-cols-3">
          {t.steps.map((step, index) => {
            const { icon: Icon, bubble, tag } = stepStyles[index] ?? stepStyles[0]!;
            return (
              <li
                key={step.title}
                data-reveal="pop"
                style={{ '--reveal-order': index } as CSSProperties}
                className="relative flex flex-col rounded-[2rem] bg-card p-7 shadow-soft"
              >
                <div className="flex items-center justify-between">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-16 items-center justify-center rounded-full font-display text-3xl font-black text-ink',
                      bubble,
                    )}
                  >
                    {index + 1}
                  </span>
                  <Icon aria-hidden="true" className="size-8 text-ink-soft" />
                </div>
                <p
                  className={cn(
                    'mt-6 w-fit rounded-full px-3 py-1 font-display text-sm font-extrabold',
                    tag,
                  )}
                >
                  {step.actor}
                </p>
                <h3 className="mt-3 font-display text-2xl leading-snug font-extrabold text-ink">
                  {step.title}
                </h3>
                <p className="mt-3 text-ink-soft">{step.description}</p>
              </li>
            );
          })}
        </ol>
      </div>
      <Wave className="text-paper" />
    </section>
  );
}

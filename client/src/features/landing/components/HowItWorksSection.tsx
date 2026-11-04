import { PencilLineIcon, SparkleIcon, StudentIcon, type Icon } from '@phosphor-icons/react';
import type { CSSProperties } from 'react';
import { cn } from '@/shared/lib/utils';
import { blobShape } from '@/shared/visual/subjectIcons';
import { text } from '@/text/sr-Latn';
import { sectionIds } from '../sections';

// One icon and colour per step, in the order of text.landing.howItWorks.steps.
const stepLooks: { icon: Icon; tone: string }[] = [
  { icon: PencilLineIcon, tone: 'bg-butter text-butter-ink' },
  { icon: SparkleIcon, tone: 'bg-lilac text-lilac-ink' },
  { icon: StudentIcon, tone: 'bg-mint text-mint-ink' },
];

export function HowItWorksSection() {
  const t = text.landing.howItWorks;
  const headingId = `${sectionIds.howItWorks}-heading`;

  return (
    <section id={sectionIds.howItWorks} aria-labelledby={headingId}>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <h2
          id={headingId}
          data-reveal=""
          className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
        >
          {t.title}
        </h2>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {t.steps.map((step, index) => {
            const { icon: StepIcon, tone } = stepLooks[index % stepLooks.length]!;
            return (
              <li
                key={step}
                data-reveal=""
                style={{ '--reveal-order': index } as CSSProperties}
                className="relative rounded-[2rem] bg-card p-7 shadow-soft"
              >
                <div className="flex items-center gap-4">
                  <span
                    aria-hidden="true"
                    className={cn('flex size-14 items-center justify-center', blobShape, tone)}
                  >
                    <StepIcon weight="duotone" className="size-7" />
                  </span>
                  <span
                    aria-hidden="true"
                    className="font-display text-5xl font-semibold text-ink/10"
                  >
                    {index + 1}
                  </span>
                </div>
                <p className="mt-5 text-lg text-ink">{step}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

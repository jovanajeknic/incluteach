import { Info } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { text } from '@/text/sr-Latn';
import { sectionIds } from '../sections';
import { SectionHeading } from './SectionHeading';

// Each step gets its own accent, so the three stages read as one path with distinct stops.
const stepAccents = [
  'bg-petrol text-white',
  'bg-apricot text-petrol-deep',
  'bg-petrol-tint text-petrol-deep ring-2 ring-petrol',
];

export function HowItWorksSection() {
  const t = text.landing.howItWorks;
  const headingId = `${sectionIds.howItWorks}-heading`;

  return (
    <section
      id={sectionIds.howItWorks}
      aria-labelledby={headingId}
      className="bg-paper-deep py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="reveal-on-scroll flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading id={headingId} eyebrow={t.eyebrow} title={t.title} />
          <p className="flex max-w-md items-start gap-3 rounded-2xl border border-gold/50 bg-gold-tint px-5 py-4 text-ink">
            <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-apricot-ink" />
            {t.plannedNote}
          </p>
        </div>

        <div className="relative mt-16">
          {/* Decorative path that joins the three steps on wide screens. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 1000 40"
            preserveAspectRatio="none"
            className="absolute top-2 right-[16%] left-[16%] hidden h-10 lg:block"
          >
            <path
              d="M0 20C160 -6 340 46 500 20S840 -6 1000 20"
              fill="none"
              className="stroke-petrol/35"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="2 12"
            />
          </svg>

          <ol className="relative grid gap-10 lg:grid-cols-3 lg:gap-8">
            {t.steps.map((step, index) => (
              <li
                key={step.title}
                className="reveal-on-scroll flex gap-5 lg:flex-col lg:items-center lg:text-center"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-14 shrink-0 items-center justify-center rounded-full font-display text-2xl font-semibold shadow-soft',
                    stepAccents[index],
                  )}
                >
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-bold tracking-wide text-petrol uppercase">
                    {step.actor}
                  </p>
                  <h3 className="mt-2 font-display text-2xl leading-snug font-semibold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-3 max-w-sm text-ink-soft lg:mx-auto">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

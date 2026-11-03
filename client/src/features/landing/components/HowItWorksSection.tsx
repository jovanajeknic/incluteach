import type { CSSProperties } from 'react';
import { text } from '@/text/sr-Latn';
import { sectionIds } from '../sections';

export function HowItWorksSection() {
  const t = text.landing.howItWorks;
  const headingId = `${sectionIds.howItWorks}-heading`;

  return (
    <section id={sectionIds.howItWorks} aria-labelledby={headingId}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="border-t border-line pt-12 pb-16 sm:pt-14">
          <h2
            id={headingId}
            data-reveal=""
            className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl"
          >
            {t.title}
          </h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {t.steps.map((step, index) => (
              <li
                key={step}
                data-reveal=""
                style={{ '--reveal-order': index } as CSSProperties}
                className="flex gap-4"
              >
                <span
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ochre font-display text-lg font-bold text-ink"
                >
                  {index + 1}
                </span>
                <p className="pt-2 text-lg text-ink">{step}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-sm text-ink-soft">{t.note}</p>
        </div>
      </div>
    </section>
  );
}

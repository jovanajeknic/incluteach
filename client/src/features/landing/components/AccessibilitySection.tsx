import {
  CheckCircle2,
  CircleDashed,
  Layers,
  ShieldCheck,
  SlidersHorizontal,
  TextQuote,
  type LucideIcon,
} from 'lucide-react';
import { text } from '@/text/sr-Latn';
import { sectionIds } from '../sections';
import { SectionHeading } from './SectionHeading';

const principleIcons: LucideIcon[] = [TextQuote, SlidersHorizontal, Layers, ShieldCheck];

export function AccessibilitySection() {
  const t = text.landing.accessibility;
  const headingId = `${sectionIds.accessibility}-heading`;

  return (
    <section
      id={sectionIds.accessibility}
      aria-labelledby={headingId}
      className="bg-paper-deep py-20 sm:py-28"
    >
      <div className="mx-auto grid max-w-6xl gap-14 px-4 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:px-8">
        <div className="reveal-on-scroll">
          <SectionHeading id={headingId} eyebrow={t.eyebrow} title={t.title} intro={t.intro} />
          <ul className="mt-10 grid gap-x-8 gap-y-7 sm:grid-cols-2">
            {t.principles.map((principle, index) => {
              const Icon = principleIcons[index] ?? Layers;
              return (
                <li key={principle.title}>
                  <Icon aria-hidden="true" className="size-6 text-petrol" />
                  <h3 className="mt-3 text-lg font-bold text-ink">{principle.title}</h3>
                  <p className="mt-1 text-ink-soft">{principle.description}</p>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="reveal-on-scroll self-start rounded-[2rem] border bg-card p-7 shadow-soft sm:p-9">
          <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
            <CheckCircle2 aria-hidden="true" className="size-5 text-petrol" />
            {t.availableTitle}
          </h3>
          <ul className="mt-4 space-y-3">
            {t.available.map((item) => (
              <li key={item} className="flex gap-3 text-ink">
                <span
                  aria-hidden="true"
                  className="mt-2.5 size-1.5 shrink-0 rounded-full bg-petrol"
                />
                {item}
              </li>
            ))}
          </ul>

          <div className="my-7 border-t border-dashed" />

          <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
            <CircleDashed aria-hidden="true" className="size-5 text-apricot-ink" />
            {t.plannedTitle}
          </h3>
          <ul className="mt-4 space-y-3">
            {t.planned.map((item) => (
              <li key={item} className="flex gap-3 text-ink-soft">
                <span
                  aria-hidden="true"
                  className="mt-2 size-2 shrink-0 rounded-full border-2 border-apricot-ink"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

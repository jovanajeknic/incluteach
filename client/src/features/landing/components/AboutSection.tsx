import { text } from '@/text/sr-Latn';
import { sectionIds } from '../sections';

export function AboutSection() {
  const t = text.landing.about;
  const headingId = `${sectionIds.about}-heading`;

  return (
    <section id={sectionIds.about} aria-labelledby={headingId}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div data-reveal="" className="border-t border-line pt-12 pb-20 sm:pt-14">
          <h2
            id={headingId}
            className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl"
          >
            {t.title}
          </h2>
          <p className="mt-6 max-w-2xl text-lg text-ink-soft">{t.text}</p>
        </div>
      </div>
    </section>
  );
}

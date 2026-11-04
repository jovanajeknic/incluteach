import { HeartIcon } from '@phosphor-icons/react';
import { cn } from '@/shared/lib/utils';
import { blobShape } from '@/shared/visual/subjectIcons';
import { text } from '@/text/sr-Latn';
import { sectionIds } from '../sections';

export function AboutSection() {
  const t = text.landing.about;
  const headingId = `${sectionIds.about}-heading`;

  return (
    <section id={sectionIds.about} aria-labelledby={headingId}>
      <div className="mx-auto max-w-6xl px-4 pt-4 pb-20 sm:px-6 lg:px-8">
        <div
          data-reveal=""
          className="relative overflow-hidden rounded-[2.25rem] bg-mint p-8 sm:p-12"
        >
          <span
            aria-hidden="true"
            className="absolute -right-16 -bottom-24 size-72 rounded-full bg-mint-deep opacity-40"
          />
          <span
            aria-hidden="true"
            className={cn(
              'relative flex size-14 items-center justify-center bg-card text-blush-ink',
              blobShape,
            )}
          >
            <HeartIcon weight="duotone" className="size-8" />
          </span>
          <h2
            id={headingId}
            className="relative mt-5 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
          >
            {t.title}
          </h2>
          <p className="relative mt-4 max-w-2xl text-lg text-ink">{t.text}</p>
        </div>
      </div>
    </section>
  );
}

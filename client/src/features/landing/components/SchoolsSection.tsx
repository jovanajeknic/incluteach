import { ArrowRightIcon, BuildingsIcon } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { schoolRequestPath } from '@/features/school-request/paths';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { blobShape } from '@/shared/visual/subjectIcons';
import { text } from '@/text/sr-Latn';
import { sectionIds } from '../sections';

export function SchoolsSection() {
  const t = text.landing.schools;
  const headingId = `${sectionIds.schools}-heading`;

  return (
    <section id={sectionIds.schools} aria-labelledby={headingId}>
      <div className="mx-auto max-w-6xl px-4 pt-4 pb-12 sm:px-6 lg:px-8">
        <div
          data-reveal=""
          className="relative flex flex-col gap-6 overflow-hidden rounded-[2.25rem] bg-butter p-8 sm:flex-row sm:items-center sm:justify-between sm:p-12"
        >
          <span
            aria-hidden="true"
            className="absolute -top-20 -right-16 size-64 rounded-full bg-butter-deep opacity-40"
          />
          <div className="relative flex items-start gap-5">
            <span
              aria-hidden="true"
              className={cn(
                'flex size-14 shrink-0 items-center justify-center bg-card text-butter-ink',
                blobShape,
              )}
            >
              <BuildingsIcon weight="duotone" className="size-8" />
            </span>
            <div>
              <h2
                id={headingId}
                className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
              >
                {t.title}
              </h2>
              <p className="mt-3 max-w-xl text-lg text-ink">{t.text}</p>
            </div>
          </div>
          <Button asChild size="lg" className="relative h-13 shrink-0 px-7 text-base">
            <Link to={schoolRequestPath}>
              {t.cta}
              <ArrowRightIcon aria-hidden="true" weight="bold" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

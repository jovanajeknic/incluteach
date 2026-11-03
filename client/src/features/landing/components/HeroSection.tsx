import { ArrowDown, ArrowRight, Info } from 'lucide-react';
import { Link } from 'react-router';
import { teacherHomePath } from '@/features/lessons/paths';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { sectionIds } from '../sections';
import { LessonModesVisual } from './LessonModesVisual';

export function HeroSection() {
  const t = text.landing.hero;
  const [firstSentence, secondSentence] = splitTitle(t.title);

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-8 lg:pt-20 lg:pb-28">
        <div>
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-petrol/15 bg-card px-4 py-1.5 text-sm font-semibold text-petrol-deep shadow-soft">
            <span aria-hidden="true" className="size-2 rounded-full bg-apricot" />
            {t.eyebrow}
          </p>
          <h1
            id="hero-title"
            className="font-display text-[2.5rem] leading-[1.06] font-semibold tracking-tight text-balance text-ink sm:text-5xl lg:text-[4rem]"
          >
            {firstSentence}{' '}
            <span className="relative inline-block text-petrol">
              {secondSentence}
              {/* A hand-drawn underline in the accent colour. */}
              <svg
                aria-hidden="true"
                viewBox="0 0 300 16"
                preserveAspectRatio="none"
                className="absolute -bottom-2 left-0 h-3 w-full text-apricot"
              >
                <path
                  d="M3 11c60-7 140-9 294-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-soft sm:text-xl">
            {t.description}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild size="lg" className="h-12 px-7 text-base">
              <Link to={teacherHomePath}>
                {t.primaryAction}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 bg-card px-7 text-base">
              <a href={`#${sectionIds.howItWorks}`}>
                {t.secondaryAction}
                <ArrowDown aria-hidden="true" />
              </a>
            </Button>
          </div>
          <p className="mt-5 flex items-center gap-2 text-sm text-ink-soft">
            <Info aria-hidden="true" className="size-4 shrink-0" />
            {t.demoNote}
          </p>
        </div>

        <LessonModesVisual />
      </div>
    </section>
  );
}

/** Splits "First sentence. Second sentence." so the second one can be highlighted. */
function splitTitle(title: string): [string, string] {
  const index = title.indexOf('. ');
  if (index === -1) return [title, ''];
  return [title.slice(0, index + 1), title.slice(index + 2)];
}

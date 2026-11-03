import { ArrowDown, ArrowRight, Info } from 'lucide-react';
import { Link } from 'react-router';
import { teacherHomePath } from '@/features/lessons/paths';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { sectionIds } from '../sections';
import { LessonModesVisual } from './LessonModesVisual';
import { Wave } from './Wave';

export function HeroSection() {
  const t = text.landing.hero;
  const [firstSentence, secondSentence] = splitTitle(t.title);

  return (
    <section aria-labelledby="hero-title" className="relative isolate bg-mint">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-12 pb-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-8 lg:pt-20 lg:pb-16">
        <div data-reveal="left">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-card px-4 py-1.5 font-display text-sm font-extrabold text-teal shadow-soft">
            <span aria-hidden="true" className="flex gap-1">
              <span className="size-2 rounded-full bg-blush-deep" />
              <span className="size-2 rounded-full bg-butter-deep" />
              <span className="size-2 rounded-full bg-lilac-deep" />
            </span>
            {t.eyebrow}
          </p>
          <h1
            id="hero-title"
            className="font-display text-[2.6rem] leading-[1.08] font-black tracking-tight text-balance text-ink sm:text-5xl lg:text-[4rem]"
          >
            {firstSentence}{' '}
            <span className="relative inline-block text-teal">
              {secondSentence}
              {/* A playful hand-drawn squiggle under the promise. */}
              <svg
                aria-hidden="true"
                viewBox="0 0 300 18"
                preserveAspectRatio="none"
                className="absolute -bottom-2.5 left-0 h-3.5 w-full text-blush-deep"
              >
                <path
                  d="M3 12c25-10 45 6 70-2s45-10 70 0 45 8 70-1 45-8 84-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink sm:text-xl">
            {t.description}
          </p>
          <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <Button asChild size="lg" className="h-13 px-7 text-base">
              <Link to={teacherHomePath}>
                {t.primaryAction}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-13 px-7 text-base">
              <a href={`#${sectionIds.howItWorks}`}>
                {t.secondaryAction}
                <ArrowDown aria-hidden="true" />
              </a>
            </Button>
          </div>
          <p className="mt-6 flex items-center gap-2 text-sm text-ink-soft">
            <Info aria-hidden="true" className="size-4 shrink-0" />
            {t.demoNote}
          </p>
        </div>

        <div data-reveal="right">
          <LessonModesVisual />
        </div>
      </div>
      <Wave className="text-blush" />
    </section>
  );
}

/** Splits "First sentence. Second sentence." so the second one can be highlighted. */
function splitTitle(title: string): [string, string] {
  const index = title.indexOf('. ');
  if (index === -1) return [title, ''];
  return [title.slice(0, index + 1), title.slice(index + 2)];
}

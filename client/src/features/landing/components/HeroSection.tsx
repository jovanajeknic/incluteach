import { ArrowRight } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { registerPath } from '@/features/auth/paths';
import { teacherHomePath } from '@/features/lessons/paths';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { LessonModesVisual } from './LessonModesVisual';
import { Wave } from './Wave';

export function HeroSection() {
  const t = text.landing.hero;
  const [firstSentence, secondSentence] = splitTitle(t.title);

  return (
    <section aria-labelledby="hero-title" className="relative isolate bg-mint">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-8 lg:pt-16 lg:pb-14">
        <div data-reveal="">
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
          <p className="mt-8 max-w-lg text-lg leading-relaxed text-ink sm:text-xl">
            {t.description}
          </p>
          <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            <Button asChild size="lg" className="h-13 px-7 text-base">
              <Link to={registerPath}>
                {text.landing.nav.register}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-13 px-7 text-base">
              <Link to={teacherHomePath}>{t.demoAction}</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-ink-soft">{t.demoNote}</p>
        </div>

        <div data-reveal="pop" style={{ '--reveal-order': 2 } as CSSProperties}>
          <LessonModesVisual />
        </div>
      </div>
      <Wave className="text-paper" />
    </section>
  );
}

/** Splits "First sentence. Second sentence." so the second one can be highlighted. */
function splitTitle(title: string): [string, string] {
  const index = title.indexOf('. ');
  if (index === -1) return [title, ''];
  return [title.slice(0, index + 1), title.slice(index + 2)];
}

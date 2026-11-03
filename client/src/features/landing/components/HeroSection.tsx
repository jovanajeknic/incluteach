import { ArrowRight } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { teacherHomePath } from '@/features/lessons/paths';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { sectionIds } from '../sections';

// Intrinsic size of the illustration file, so the browser reserves space and nothing jumps.
const ILLUSTRATION_WIDTH = 723;
const ILLUSTRATION_HEIGHT = 378;

export function HeroSection() {
  const t = text.landing.hero;

  return (
    <section aria-labelledby="hero-title" className="overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-8 pb-12 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-6 lg:px-8 lg:pt-4 lg:pb-16">
        <div data-reveal="" className="lg:py-12">
          <p className="font-display text-sm font-medium tracking-[0.2em] text-forest uppercase">
            {t.eyebrow}
          </p>
          <h1
            id="hero-title"
            className="mt-5 font-display text-[2.6rem] leading-[1.1] font-bold tracking-tight text-ink sm:text-5xl lg:text-[3.6rem]"
          >
            {t.titleFirst} <br />
            <span className="text-forest">{t.titleSecond}</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-ink-soft">{t.description}</p>
          <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Button asChild size="lg" className="h-13 px-8 text-base">
              <Link to={teacherHomePath}>{t.explore}</Link>
            </Button>
            <a
              href={`#${sectionIds.about}`}
              className="group inline-flex items-center gap-2 rounded-full font-display font-medium text-ink hover:text-forest"
            >
              {t.ourStory}
              <ArrowRight
                aria-hidden="true"
                className="size-5 transition-transform duration-200 group-hover:translate-x-1"
              />
            </a>
          </div>
        </div>

        <div data-reveal="pop" style={{ '--reveal-order': 2 } as CSSProperties}>
          <img
            src="/images/hero-illustration.png"
            alt={t.imageAlt}
            width={ILLUSTRATION_WIDTH}
            height={ILLUSTRATION_HEIGHT}
            fetchPriority="high"
            className="h-auto w-full"
          />
        </div>
      </div>
    </section>
  );
}

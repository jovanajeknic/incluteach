import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { teacherHomePath } from '@/features/lessons/paths';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { sectionIds } from '../sections';

const PHOTO_SRC = '/images/hero-classroom.jpg';
// Intrinsic size of the photo file, so the browser reserves space and nothing jumps.
const PHOTO_WIDTH = 1400;
const PHOTO_HEIGHT = 797;

export function HeroSection() {
  const t = text.landing.hero;

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      {/*
        Background photo, purely atmospheric: hidden from screen readers and softened in CSS
        (.hero-photo) so it blends into the page instead of competing with the text.
      */}
      <div aria-hidden="true" className="absolute inset-y-0 right-0 -z-10 hidden w-[62%] lg:block">
        <img
          src={PHOTO_SRC}
          alt=""
          width={PHOTO_WIDTH}
          height={PHOTO_HEIGHT}
          fetchPriority="high"
          className="hero-photo size-full object-cover object-[45%_35%]"
        />
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:flex lg:min-h-[540px] lg:items-center lg:px-8 lg:pt-0">
        <div data-reveal="" className="max-w-xl py-4 lg:py-16">
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
      </div>

      {/* Phones and tablets: the same photo below the text, faded on every side. */}
      <div aria-hidden="true" className="-mt-2 px-2 pb-6 lg:hidden">
        <img
          src={PHOTO_SRC}
          alt=""
          width={PHOTO_WIDTH}
          height={PHOTO_HEIGHT}
          loading="lazy"
          className="hero-photo-mobile mx-auto h-auto w-full max-w-2xl"
        />
      </div>
    </section>
  );
}

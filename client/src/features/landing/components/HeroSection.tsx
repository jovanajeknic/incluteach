import { ArrowRightIcon, SparkleIcon } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { teacherHomePath } from '@/features/lessons/paths';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { sectionIds } from '../sections';

const PHOTO_SRC = '/images/hero-classroom.jpg';

export function HeroSection() {
  const t = text.landing.hero;

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      {/*
        The photo is the background of the whole hero, like wallpaper: it always covers the
        section edge to edge. It is softened (.hero-photo) and sits under a cream veil, so it
        sets the mood without competing with the text. Decorative, so hidden from screen readers.
      */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <img
          src={PHOTO_SRC}
          alt=""
          fetchPriority="high"
          className="hero-photo size-full object-cover object-[60%_35%]"
        />
        <div className="hero-veil absolute inset-0" />
      </div>

      <div className="mx-auto flex min-h-[78vh] max-w-6xl items-center px-4 py-16 sm:px-6 lg:min-h-[640px] lg:px-8">
        <div data-reveal="" className="max-w-xl">
          <p className="inline-flex items-center gap-2 font-display text-base font-medium text-forest">
            <SparkleIcon aria-hidden="true" weight="duotone" className="size-5 text-butter-ink" />
            {t.eyebrow}
          </p>
          <h1
            id="hero-title"
            className="mt-4 font-display text-[2.7rem] leading-[1.08] font-semibold tracking-tight text-ink sm:text-6xl lg:text-[4rem]"
          >
            {t.titleFirst} <br />
            <span className="text-forest">{t.titleSecond}</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-ink">{t.description}</p>
          <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Button asChild size="lg" className="h-13 px-8 text-base shadow-soft">
              <Link to={teacherHomePath}>{t.explore}</Link>
            </Button>
            <a
              href={`#${sectionIds.about}`}
              className="group inline-flex items-center gap-2 rounded-full font-display font-medium text-ink hover:text-forest"
            >
              {t.ourStory}
              <ArrowRightIcon
                aria-hidden="true"
                weight="bold"
                className="size-5 transition-transform duration-200 group-hover:translate-x-1"
              />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

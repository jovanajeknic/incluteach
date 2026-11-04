import { ArrowLeftIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { Link, ScrollRestoration } from 'react-router';
import { Logo } from '@/shared/brand/Logo';
import { MAIN_CONTENT_ID, SkipLink } from '@/shared/components/SkipLink';
import { text } from '@/text/sr-Latn';

const PHOTO_SRC = '/images/hero-classroom.jpg';

/**
 * Shared frame for sign-in, activation and the school request. On large screens the left
 * half carries the classroom photo as a calm background with the brand line; the form sits
 * alone on a white right half. On phones only the form column is shown.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const hero = text.landing.hero;
  return (
    <div className="area-theme min-h-screen bg-card lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <SkipLink />

      <aside aria-hidden="true" className="relative isolate hidden overflow-hidden lg:block">
        <img
          src={PHOTO_SRC}
          alt=""
          className="hero-photo absolute inset-0 -z-10 size-full object-cover object-[60%_35%]"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(160deg,rgb(214_230_228/0.92),rgb(253_246_236/0.85))]" />
        <div className="sticky top-0 flex h-screen flex-col justify-between p-12">
          <Logo markClassName="h-11" />
          <p className="max-w-md font-display text-4xl leading-tight font-semibold tracking-tight text-ink">
            {hero.titleFirst}
            <br />
            <span className="text-forest">{hero.titleSecond}</span>
          </p>
        </div>
      </aside>

      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="flex min-h-screen flex-col px-5 py-8 focus:outline-none sm:px-10 lg:py-12"
      >
        <div className="flex items-center justify-between gap-4">
          {/* On large screens the logo is in the photo panel. */}
          <Link to="/" aria-label={text.app.homeLinkLabel} className="w-fit rounded-xl lg:hidden">
            <Logo markClassName="h-10" />
          </Link>
          <Link
            to="/"
            className="ml-auto inline-flex items-center gap-1.5 rounded-full font-display font-medium text-ink-soft hover:text-forest"
          >
            <ArrowLeftIcon aria-hidden="true" weight="bold" className="size-4" />
            {text.auth.backHome}
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-10">
          {children}
        </div>
      </main>
      <ScrollRestoration />
    </div>
  );
}

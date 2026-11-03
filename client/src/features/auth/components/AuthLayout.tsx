import type { ReactNode } from 'react';
import { Link, ScrollRestoration } from 'react-router';
import { Logo } from '@/shared/brand/Logo';
import { MAIN_CONTENT_ID, SkipLink } from '@/shared/components/SkipLink';
import { text } from '@/text/sr-Latn';

// Same photo as the landing page; cropped with object-fit, never stretched.
const PHOTO_SRC = '/images/hero-classroom.jpg';

function HomeLogoLink({ className }: { className?: string }) {
  return (
    <Link to="/" aria-label={text.app.homeLinkLabel} className={`rounded-xl ${className ?? ''}`}>
      <Logo markClassName="h-10" />
    </Link>
  );
}

/**
 * Shared frame for sign-in and registration: a welcome panel with the classroom photo on
 * wide screens, and the form first on phones.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const t = text.auth.welcomePanel;

  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-2">
      <SkipLink />

      <aside className="relative hidden flex-col gap-10 overflow-hidden bg-mint p-10 lg:flex xl:p-14">
        <div
          aria-hidden="true"
          className="absolute -top-16 -right-16 size-56 rounded-full bg-lilac/70"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-20 -left-12 size-64 rounded-full bg-blush/60"
        />

        <HomeLogoLink className="relative w-fit" />

        <div className="relative max-w-md">
          <p className="font-display text-4xl leading-tight font-bold tracking-tight text-ink xl:text-[2.75rem]">
            {t.title}
          </p>
          <p className="mt-4 text-lg text-ink-soft">{t.text}</p>
        </div>

        <div className="relative mt-auto overflow-hidden rounded-[2rem] shadow-soft">
          <img
            src={PHOTO_SRC}
            alt=""
            width={1400}
            height={797}
            className="aspect-[4/3] w-full object-cover object-[45%_40%] saturate-[0.9]"
          />
        </div>
      </aside>

      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="flex min-h-screen flex-col px-4 py-6 focus:outline-none sm:px-8 lg:min-h-0 lg:py-10"
      >
        <HomeLogoLink className="w-fit lg:hidden" />
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-8">
          {children}
        </div>
      </main>
      <ScrollRestoration />
    </div>
  );
}

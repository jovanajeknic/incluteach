import type { ReactNode } from 'react';
import { Link, ScrollRestoration } from 'react-router';
import { Logo } from '@/shared/brand/Logo';
import { MAIN_CONTENT_ID, SkipLink } from '@/shared/components/SkipLink';
import { text } from '@/text/sr-Latn';

/**
 * Shared frame for sign-in and registration: one calm, centred column with the logo
 * above the form card and a few soft pastel shapes in the corners.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-paper">
      <SkipLink />

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 size-72 rounded-full bg-mint/70 sm:size-96" />
        <div className="absolute -right-20 -bottom-28 size-72 rounded-full bg-lilac/60 sm:size-96" />
        <div className="absolute top-1/3 -right-10 size-24 rounded-full bg-blush/70 sm:size-32" />
      </div>

      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col justify-center gap-8 px-4 py-10 focus:outline-none"
      >
        <Link to="/" aria-label={text.app.homeLinkLabel} className="mx-auto w-fit rounded-xl">
          <Logo markClassName="h-11" />
        </Link>
        {children}
      </main>
      <ScrollRestoration />
    </div>
  );
}

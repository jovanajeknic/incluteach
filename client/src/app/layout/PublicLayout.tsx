import { Link, Outlet, ScrollRestoration } from 'react-router';
import { Logo } from '@/shared/brand/Logo';
import { MAIN_CONTENT_ID, SkipLink } from '@/shared/components/SkipLink';
import { text } from '@/text/sr-Latn';

/** Minimal frame for public pages other than the landing page, such as "not found". */
export function PublicLayout() {
  return (
    <div className="min-h-screen bg-paper">
      <SkipLink />
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-18 max-w-6xl items-center px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label={text.app.homeLinkLabel} className="rounded-md">
            <Logo />
          </Link>
        </div>
      </header>
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="px-4 focus:outline-none">
        <Outlet />
      </main>
      <ScrollRestoration />
    </div>
  );
}

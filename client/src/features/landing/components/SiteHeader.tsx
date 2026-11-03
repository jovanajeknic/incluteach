import { Link } from 'react-router';
import { loginPath, registerPath } from '@/features/auth/paths';
import { Logo, LogoMark } from '@/shared/brand/Logo';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';

export function SiteHeader() {
  const t = text.landing.nav;

  return (
    <header className="sticky top-0 z-40 bg-mint/90 backdrop-blur supports-[backdrop-filter]:bg-mint/80">
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label={text.app.homeLinkLabel} className="rounded-xl">
          {/* On narrow phones only the symbol fits next to both buttons. */}
          <LogoMark className="h-10 min-[440px]:hidden" />
          <Logo className="hidden min-[440px]:inline-flex" />
        </Link>

        <nav aria-label={t.label}>
          <ul className="flex items-center gap-2 sm:gap-3">
            <li>
              <Button
                asChild
                variant="outline"
                className="h-11 px-3 text-sm min-[360px]:px-4 min-[360px]:text-base sm:px-5"
              >
                <Link to={loginPath}>{t.login}</Link>
              </Button>
            </li>
            <li>
              <Button
                asChild
                className="h-11 px-3 text-sm min-[360px]:px-4 min-[360px]:text-base sm:px-5"
              >
                <Link to={registerPath}>{t.register}</Link>
              </Button>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

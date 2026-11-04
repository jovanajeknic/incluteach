import { ListIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { loginPath } from '@/features/auth/paths';
import { Logo, LogoMark } from '@/shared/brand/Logo';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { sectionLinks } from '../sections';

const MENU_ID = 'site-mobile-menu';

const navLinkClassName =
  'rounded-full px-3 py-2 font-display text-[0.95rem] text-ink transition-colors duration-150 hover:text-forest';

export function SiteHeader() {
  const t = text.landing.nav;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Escape closes the menu and returns focus to the button that opened it.
  useEffect(() => {
    if (!menuOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/85">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label={text.app.homeLinkLabel} className="shrink-0 rounded-xl">
          {/* On narrow phones only the symbol fits next to the buttons. */}
          <LogoMark className="h-10 min-[400px]:hidden" />
          <Logo className="hidden min-[400px]:inline-flex" markClassName="h-10" />
        </Link>

        <nav aria-label={t.label} className="hidden lg:block">
          <ul className="flex items-center gap-6">
            {sectionLinks.map((link) => (
              <li key={link.id}>
                <a href={`#${link.id}`} className={navLinkClassName}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <Button asChild className="h-11 px-5 text-[0.95rem]">
            <Link to={loginPath}>{t.login}</Link>
          </Button>
          <Button
            ref={menuButtonRef}
            type="button"
            variant="outline"
            className="h-11 px-3 text-[0.95rem] sm:px-4 lg:hidden"
            aria-expanded={menuOpen}
            aria-controls={MENU_ID}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <XIcon aria-hidden="true" weight="bold" />
            ) : (
              <ListIcon aria-hidden="true" weight="bold" />
            )}
            {t.menu}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div id={MENU_ID} className="border-t border-line bg-paper lg:hidden">
          <nav aria-label={t.label} className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
            <ul className="flex flex-col gap-1">
              {sectionLinks.map((link) => (
                <li key={link.id}>
                  <a
                    href={`#${link.id}`}
                    onClick={closeMenu}
                    className="block rounded-2xl px-4 py-3 font-display text-lg text-ink hover:bg-forest/5"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}

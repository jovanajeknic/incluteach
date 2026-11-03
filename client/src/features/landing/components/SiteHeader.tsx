import { Menu, X } from 'lucide-react';
import { useEffect, useRef, useState, type Ref } from 'react';
import { Link } from 'react-router';
import { teacherHomePath } from '@/features/lessons/paths';
import { Logo } from '@/shared/brand/Logo';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { sectionLinks } from '../sections';

const MENU_ID = 'site-mobile-menu';

const navLinkClassName =
  'rounded-full px-3 py-2 font-medium text-ink transition-colors duration-150 hover:bg-navy-tint hover:text-navy-deep';

interface SiteHeaderProps {
  /** Lets the logo intro measure where the header logo sits. */
  logoRef?: Ref<SVGSVGElement>;
  /** Hides the header symbol while the intro logo is flying into its place. */
  hideLogoMark?: boolean;
}

export function SiteHeader({ logoRef, hideLogoMark = false }: SiteHeaderProps) {
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
    <header className="sticky top-0 z-40 border-b border-border/70 bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label={text.app.homeLinkLabel} className="rounded-md">
          <Logo markRef={logoRef} markClassName={cn(hideLogoMark && 'opacity-0')} />
        </Link>

        <nav aria-label={t.label} className="hidden md:block">
          <ul className="flex items-center gap-1">
            {sectionLinks.map((link) => (
              <li key={link.id}>
                <a href={`#${link.id}`} className={navLinkClassName}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild size="lg" className="hidden text-base sm:inline-flex">
            <Link to={teacherHomePath}>{t.tryDemo}</Link>
          </Button>
          <Button
            ref={menuButtonRef}
            type="button"
            variant="outline"
            size="lg"
            className="text-base md:hidden"
            aria-expanded={menuOpen}
            aria-controls={MENU_ID}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            {t.menu}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div id={MENU_ID} className="border-t border-border/70 bg-paper md:hidden">
          <nav aria-label={t.label} className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
            <ul className="flex flex-col gap-1">
              {sectionLinks.map((link) => (
                <li key={link.id}>
                  <a
                    href={`#${link.id}`}
                    onClick={closeMenu}
                    className="block rounded-xl px-3 py-3 text-lg font-medium text-ink hover:bg-navy-tint"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="mt-4 w-full text-base">
              <Link to={teacherHomePath} onClick={closeMenu}>
                {t.tryDemo}
              </Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}

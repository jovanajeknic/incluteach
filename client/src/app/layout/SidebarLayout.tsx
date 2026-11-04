import { ListIcon, XIcon, type Icon } from '@phosphor-icons/react';
import { MotionConfig, motion } from 'motion/react';
import { useId, useState } from 'react';
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router';
import { Logo } from '@/shared/brand/Logo';
import { MAIN_CONTENT_ID, SkipLink } from '@/shared/components/SkipLink';
import { cn } from '@/shared/lib/utils';
import { PageTransition } from '@/shared/motion/PageTransition';
import { useSmoothScroll } from '@/shared/motion/useSmoothScroll';
import { blobShape } from '@/shared/visual/subjectIcons';
import { text } from '@/text/sr-Latn';

export interface SidebarNavItem {
  to: string;
  label: string;
  icon: Icon;
  /** Blob behind the icon; pastel surface with its matching ink. */
  tone: string;
  /** For the home page, so it is not marked on every page below it. */
  end?: boolean;
  /** A small number next to the label, with words for screen readers. */
  count?: { value: number; label: string };
}

interface SidebarLayoutProps {
  navLabel: string;
  navItems: readonly SidebarNavItem[];
  /** One highlighted action under the navigation, e.g. "Dodaj lekciju". */
  action?: { to: string; label: string; icon: Icon };
  person: { name: string; initials: string; role: string; badge: string };
  demoNotice: string;
}

/**
 * Shared frame for the teacher and student areas. One navigation element for every screen
 * size: a light mint sidebar from the `md` breakpoint up, and a disclosure menu under a top
 * bar on phones. The current page is joined to the content by a curved tab, so the sidebar
 * and the page read as one surface.
 */
export function SidebarLayout({
  navLabel,
  navItems,
  action,
  person,
  demoNotice,
}: SidebarLayoutProps) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const navId = useId();

  useSmoothScroll();
  // A chosen destination closes the phone menu.
  const closeMenu = () => setMenuOpen(false);

  return (
    <MotionConfig reducedMotion="user">
      <div className="area-theme min-h-screen bg-mint md:flex">
        <SkipLink />

        <aside className="text-ink md:sticky md:top-0 md:flex md:h-screen md:w-68 md:shrink-0 md:flex-col">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-7 md:pt-8 md:pb-9">
            <Link to="/" aria-label={text.app.homeLinkLabel} className="inline-flex rounded-md">
              <Logo />
            </Link>
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-controls={navId}
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-white/60 md:hidden"
            >
              {menuOpen ? (
                <XIcon aria-hidden="true" weight="bold" className="size-6" />
              ) : (
                <ListIcon aria-hidden="true" weight="bold" className="size-6" />
              )}
              <span className="sr-only">{menuOpen ? text.nav.closeMenu : text.nav.openMenu}</span>
            </button>
          </div>

          <div
            id={navId}
            className={cn('pb-5 md:flex md:flex-1 md:flex-col md:pb-6', !menuOpen && 'hidden')}
          >
            <nav aria-label={navLabel} className="px-3 md:pr-0 md:pl-4">
              <ul className="flex flex-col gap-2">
                {navItems.map(({ to, label, icon: ItemIcon, tone, end, count }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={end}
                      onClick={closeMenu}
                      className={({ isActive }) =>
                        cn(
                          'sidebar-nav-link group flex items-center gap-3.5 rounded-3xl px-3 py-2.5 font-display text-[1.05rem] font-medium transition-colors md:rounded-l-[1.75rem] md:rounded-r-none md:pr-5',
                          isActive ? 'bg-background text-ink' : 'text-ink/85 hover:bg-white/55',
                        )
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'flex size-11 shrink-0 items-center justify-center transition-transform duration-300 ease-bounce group-hover:scale-110 group-hover:-rotate-6',
                          blobShape,
                          tone,
                        )}
                      >
                        <ItemIcon weight="duotone" className="size-6" />
                      </span>
                      {label}
                      {count && count.value > 0 && (
                        <span className="ml-auto flex h-7 min-w-7 items-center justify-center rounded-full bg-ochre px-2 font-sans text-sm font-bold text-ink">
                          {count.value}
                          <span className="sr-only"> {count.label}</span>
                        </span>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            {action && (
              <div className="mt-6 px-4 md:px-7">
                <motion.div whileHover={{ rotate: -2, scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    to={action.to}
                    onClick={closeMenu}
                    className="flex items-center justify-center gap-2 rounded-3xl bg-ochre px-5 py-3.5 font-display text-[1.05rem] font-semibold text-ink shadow-[0_5px_0_#c9973a] transition-shadow hover:shadow-[0_7px_0_#c9973a]"
                  >
                    <action.icon aria-hidden="true" weight="bold" className="size-5" />
                    {action.label}
                  </Link>
                </motion.div>
              </div>
            )}

            <div className="mt-8 px-4 md:mt-auto md:px-7">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-11 shrink-0 items-center justify-center bg-lilac font-display font-semibold text-lilac-ink',
                    blobShape,
                  )}
                >
                  {person.initials}
                </span>
                <div className="min-w-0 leading-tight">
                  <p className="truncate font-display font-medium">{person.name}</p>
                  <p className="text-sm text-ink-soft">
                    {person.role} ·{' '}
                    <span className="font-semibold text-butter-ink">{person.badge}</span>
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-ink-soft">{demoNotice}</p>
            </div>
          </div>
        </aside>

        {/* tabIndex lets the skip link move keyboard focus into the main area. */}
        <main
          id={MAIN_CONTENT_ID}
          tabIndex={-1}
          className="min-h-screen min-w-0 flex-1 bg-background focus:outline-none md:rounded-l-[2.5rem]"
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-10 md:py-12">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </div>
        </main>
        <ScrollRestoration />
      </div>
    </MotionConfig>
  );
}

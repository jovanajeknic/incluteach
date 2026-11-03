import {
  ChatsCircleIcon,
  HouseIcon,
  ListIcon,
  PlusIcon,
  StudentIcon,
  XIcon,
  type Icon,
} from '@phosphor-icons/react';
import { MotionConfig, motion } from 'motion/react';
import { useId, useState } from 'react';
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router';
import {
  classPath,
  newLessonPath,
  suggestionsPath,
  teacherHomePath,
} from '@/features/lessons/paths';
import { useSchool } from '@/features/school/schoolContext';
import { blobShape } from '@/features/teacher-ui/subjectIcons';
import { Logo } from '@/shared/brand/Logo';
import { MAIN_CONTENT_ID, SkipLink } from '@/shared/components/SkipLink';
import { initialsOf } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { PageTransition } from '@/shared/motion/PageTransition';
import { useSmoothScroll } from '@/shared/motion/useSmoothScroll';
import { text } from '@/text/sr-Latn';

interface NavItem {
  to: string;
  label: string;
  icon: Icon;
  /** Blob behind the icon; pastel surface with its matching ink. */
  tone: string;
  /** Lessons and students live under these paths too, so the item stays marked there. */
  end?: boolean;
}

const navItems: NavItem[] = [
  {
    to: teacherHomePath,
    label: text.nav.home,
    icon: HouseIcon,
    tone: 'bg-butter text-butter-ink',
    end: true,
  },
  { to: classPath, label: text.nav.myClass, icon: StudentIcon, tone: 'bg-mint text-mint-ink' },
  {
    to: suggestionsPath,
    label: text.nav.suggestions,
    icon: ChatsCircleIcon,
    tone: 'bg-blush text-blush-ink',
  },
];

/**
 * One navigation element for every screen size: a dark green sidebar from the `md`
 * breakpoint up, and a disclosure menu under a top bar on phones. The current page is
 * joined to the content by a curved tab, so the sidebar and the page read as one surface.
 */
export function TeacherLayout() {
  const { data } = useSchool();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const navId = useId();
  const teacher = data.teacher;
  const newSuggestions = data.suggestions.filter(
    (item) => item.status === 'pending-teacher',
  ).length;

  useSmoothScroll();
  // A chosen destination closes the phone menu.
  const closeMenu = () => setMenuOpen(false);

  return (
    <MotionConfig reducedMotion="user">
      <div className="teacher-theme min-h-screen bg-forest-deep md:flex">
        <SkipLink />

        <aside className="text-paper [--logo-knockout:var(--brand-forest-deep)] md:sticky md:top-0 md:flex md:h-screen md:w-68 md:shrink-0 md:flex-col">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-7 md:pt-8 md:pb-9">
            <Link to="/" aria-label={text.app.homeLinkLabel} className="inline-flex rounded-md">
              <Logo tone="inverse" />
            </Link>
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-controls={navId}
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex size-11 items-center justify-center rounded-full text-paper hover:bg-white/10 md:hidden"
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
            <nav aria-label={text.app.mainNavigation} className="px-3 md:pl-4 md:pr-0">
              <ul className="flex flex-col gap-2">
                {navItems.map(({ to, label, icon: ItemIcon, tone, end }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={end}
                      onClick={closeMenu}
                      className={({ isActive }) =>
                        cn(
                          'teacher-nav-link group flex items-center gap-3.5 rounded-3xl px-3 py-2.5 font-display text-[1.05rem] font-medium transition-colors md:rounded-r-none md:rounded-l-[1.75rem] md:pr-5',
                          isActive ? 'bg-background text-ink' : 'text-paper/90 hover:bg-white/8',
                        )
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'flex size-11 shrink-0 items-center justify-center transition-transform duration-300 ease-bounce group-hover:-rotate-6 group-hover:scale-110',
                          blobShape,
                          tone,
                        )}
                      >
                        <ItemIcon weight="duotone" className="size-6" />
                      </span>
                      {label}
                      {to === suggestionsPath && newSuggestions > 0 && (
                        <span className="ml-auto flex size-7 items-center justify-center rounded-full bg-ochre font-sans text-sm font-bold text-ink">
                          {newSuggestions}
                          <span className="sr-only"> {text.nav.newSuggestions}</span>
                        </span>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mt-6 px-4 md:px-7">
              <motion.div whileHover={{ rotate: -2, scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to={newLessonPath}
                  onClick={closeMenu}
                  className="flex items-center justify-center gap-2 rounded-3xl bg-ochre px-5 py-3.5 font-display text-[1.05rem] font-semibold text-ink shadow-[0_5px_0_#c9973a] transition-shadow hover:shadow-[0_7px_0_#c9973a]"
                >
                  <PlusIcon aria-hidden="true" weight="bold" className="size-5" />
                  {text.nav.newLesson}
                </Link>
              </motion.div>
            </div>

            <div className="mt-8 px-4 md:mt-auto md:px-7">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-11 shrink-0 items-center justify-center bg-lilac font-display font-semibold text-lilac-ink',
                    blobShape,
                  )}
                >
                  {initialsOf(teacher.firstName, teacher.lastName)}
                </span>
                <div className="min-w-0 leading-tight">
                  <p className="truncate font-display font-medium">
                    {teacher.firstName} {teacher.lastName}
                  </p>
                  <p className="text-sm text-paper/75">
                    {text.demo.profileRole} ·{' '}
                    <span className="font-semibold text-ochre">{text.demo.profileBadge}</span>
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-paper/70">{text.demo.notice}</p>
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

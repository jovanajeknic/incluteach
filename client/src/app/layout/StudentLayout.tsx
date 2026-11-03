import { Info, LayoutGrid } from 'lucide-react';
import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router';
import { useStudent } from '@/features/student/data/studentContext';
import { studentHomePath } from '@/features/student/paths';
import { Logo, LogoMark } from '@/shared/brand/Logo';
import { MAIN_CONTENT_ID, SkipLink } from '@/shared/components/SkipLink';
import { cn } from '@/shared/lib/utils';
import { text } from '@/text/sr-Latn';

export function StudentLayout() {
  const t = text.student;
  const { profile } = useStudent();
  const initials = `${profile.firstName[0] ?? ''}${profile.lastName[0] ?? ''}`;

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SkipLink />
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-18 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" aria-label={text.app.homeLinkLabel} className="shrink-0 rounded-xl">
            <LogoMark className="h-9 min-[480px]:hidden" />
            <Logo className="hidden min-[480px]:inline-flex" markClassName="h-9" />
          </Link>

          <nav aria-label={t.nav.label}>
            <NavLink
              to={studentHomePath}
              end
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-full px-4 py-2 font-display font-medium text-ink hover:bg-mint',
                  isActive && 'bg-mint text-mint-ink',
                )
              }
            >
              <LayoutGrid aria-hidden="true" className="size-5" />
              {t.nav.subjects}
            </NavLink>
          </nav>

          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-full bg-butter font-display font-bold text-butter-ink"
            >
              {initials}
            </span>
            <div className="hidden leading-tight sm:block">
              <p className="font-display font-medium text-ink">{profile.firstName}</p>
              <p className="text-sm text-ink-soft">
                {t.profile.role} · <span className="text-lilac-ink">{t.profile.badge}</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      <p className="border-b border-border bg-lilac px-4 py-2 text-center text-sm text-lilac-ink">
        <Info aria-hidden="true" className="mr-1.5 inline size-4 align-[-2px]" />
        {t.demoNotice}
      </p>

      {/* tabIndex lets the skip link move keyboard focus into the main area. */}
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 focus:outline-none sm:px-6 sm:py-10"
      >
        <Outlet />
      </main>
      <ScrollRestoration />
    </div>
  );
}

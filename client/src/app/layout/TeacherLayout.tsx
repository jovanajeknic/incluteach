import { Home, Info, Plus, type LucideIcon } from 'lucide-react';
import { NavLink, Outlet, ScrollRestoration } from 'react-router';
import { newLessonPath, teacherHomePath } from '@/features/lessons/paths';
import { cn } from '@/shared/lib/utils';
import { text } from '@/text/sr-Latn';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

// Only destinations that actually exist are listed.
const navItems: NavItem[] = [
  { to: teacherHomePath, label: text.nav.home, icon: Home },
  { to: newLessonPath, label: text.nav.newLesson, icon: Plus },
];

/**
 * One navigation element for every screen size: a top bar on phones,
 * a sidebar from the `md` breakpoint up. This avoids duplicate menus for screen readers.
 */
export function TeacherLayout() {
  return (
    <div className="min-h-screen md:flex">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {text.app.skipToContent}
      </a>

      <aside className="border-b bg-card md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-b-0">
        <div className="px-4 pt-4 pb-3 md:px-6 md:pt-7 md:pb-8">
          <p className="text-xl font-bold tracking-tight text-primary">{text.app.name}</p>
        </div>
        <nav aria-label={text.app.mainNavigation} className="px-2 pb-2 md:px-3">
          <ul className="flex gap-1 md:flex-col">
            {navItems.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2.5 font-medium text-foreground hover:bg-muted',
                      isActive && 'bg-secondary text-secondary-foreground hover:bg-secondary',
                    )
                  }
                >
                  <Icon aria-hidden="true" className="size-5" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end border-b bg-card px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-full bg-secondary font-semibold text-secondary-foreground"
            >
              {text.demo.profileInitials}
            </span>
            <div className="leading-tight">
              <p className="font-medium">{text.demo.profileName}</p>
              <p className="text-sm text-muted-foreground">
                {text.demo.profileRole} ·{' '}
                <span className="font-medium text-[#7a4a00]">{text.demo.profileBadge}</span>
              </p>
            </div>
          </div>
        </header>

        <p className="flex items-start gap-2 border-b bg-[#fdf8ec] px-4 py-2 text-sm text-[#5c4300] md:px-8">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {text.demo.notice}
        </p>

        {/* tabIndex lets the skip link move keyboard focus into the main area. */}
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 focus:outline-none md:px-8 md:py-10"
        >
          <Outlet />
        </main>
        <ScrollRestoration />
      </div>
    </div>
  );
}

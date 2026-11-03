import { ArrowRight, Hourglass } from 'lucide-react';
import { Link } from 'react-router';
import { teacherHomePath } from '@/features/lessons/paths';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';

interface AuthComingSoonPageProps {
  kind: 'login' | 'register';
}

/**
 * Honest placeholder for sign-in and registration: real accounts need the backend,
 * so these pages say so and offer the demo instead of showing a form that does nothing.
 */
export function AuthComingSoonPage({ kind }: AuthComingSoonPageProps) {
  const t = text.auth;
  const page = t[kind];

  return (
    <div className="mx-auto max-w-xl py-12 sm:py-20">
      <title>{text.app.pageTitle(page.pageTitle)}</title>
      <div className="rounded-[2.5rem] bg-blush p-8 text-center shadow-soft sm:p-12">
        <span
          aria-hidden="true"
          className="mx-auto flex size-16 items-center justify-center rounded-full bg-card text-blush-ink"
        >
          <Hourglass className="size-8" />
        </span>
        <h1 className="mt-6 font-display text-3xl font-black tracking-tight text-ink">
          {page.heading}
        </h1>
        <p className="mt-4 text-lg text-ink">{t.description}</p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="h-12 px-6 text-base">
            <Link to={teacherHomePath}>
              {t.tryDemo}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 px-6 text-base">
            <Link to="/">{t.backHome}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

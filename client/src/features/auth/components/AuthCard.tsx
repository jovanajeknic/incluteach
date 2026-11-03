import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { DemoNotice } from './AuthStatus';

interface AuthCardProps {
  title: string;
  description: string;
  switchPrompt: string;
  switchLink: string;
  switchTo: string;
  children: ReactNode;
}

/** Heading, demo notice, the form and the link to the other auth page. */
export function AuthCard({
  title,
  description,
  switchPrompt,
  switchLink,
  switchTo,
  children,
}: AuthCardProps) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">{title}</h1>
      <p className="mt-2 text-ink-soft">{description}</p>
      <div className="mt-6">
        <DemoNotice />
      </div>
      <div className="mt-6">{children}</div>
      <p className="mt-6 text-center text-ink-soft">
        {switchPrompt}{' '}
        <Link
          to={switchTo}
          className="rounded-sm font-display font-medium text-forest underline underline-offset-4 hover:text-forest-deep"
        >
          {switchLink}
        </Link>
      </p>
    </div>
  );
}

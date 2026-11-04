import type { ReactNode } from 'react';
import { DemoNotice } from './AuthStatus';

interface AuthCardProps {
  title: string;
  description?: string;
  /** Links under the form, e.g. to the other auth page. */
  footer?: ReactNode;
  children: ReactNode;
}

/** Heading, demo notice, the form and the links under it. */
export function AuthCard({ title, description, footer, children }: AuthCardProps) {
  return (
    <div className="rounded-[2rem] bg-card p-6 shadow-lifted sm:p-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{title}</h1>
      {description && <p className="mt-2 text-ink-soft">{description}</p>}
      <div className="mt-6">
        <DemoNotice />
      </div>
      <div className="mt-6">{children}</div>
      {footer && <div className="mt-6 grid gap-2 text-center text-ink-soft">{footer}</div>}
    </div>
  );
}

/** A sentence with a link at its end, as used under the auth forms. */
export function AuthFooterLink({ prompt, children }: { prompt: string; children: ReactNode }) {
  return (
    <p>
      {prompt}{' '}
      <span className="font-display font-medium text-forest underline underline-offset-4 hover:text-forest-deep [&_a]:rounded-sm">
        {children}
      </span>
    </p>
  );
}

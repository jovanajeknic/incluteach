import type { ReactNode } from 'react';

interface AuthCardProps {
  title: string;
  description?: string;
  /** Links under the form, e.g. to the other auth page. */
  footer?: ReactNode;
  children: ReactNode;
}

/** Heading, the form and the links under it. */
export function AuthCard({ title, description, footer, children }: AuthCardProps) {
  return (
    <div>
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">{title}</h1>
      {description && <p className="mt-2 text-ink-soft">{description}</p>}
      <div className="mt-8">{children}</div>
      {footer && (
        <div className="mt-8 grid gap-2 border-t border-border pt-6 text-center text-ink-soft">
          {footer}
        </div>
      )}
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

import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

interface SectionCardProps {
  id: string;
  title: string;
  intro?: string;
  /** "side" is the narrower style used in the sidebar. */
  variant?: 'main' | 'side';
  children: ReactNode;
}

/**
 * A section of a worksheet: a heading under a dashed rule, like a new task in a notebook.
 * Deliberately not a boxed card, so the page reads as one document.
 */
export function SectionCard({ id, title, intro, variant = 'main', children }: SectionCardProps) {
  const side = variant === 'side';
  return (
    <section
      aria-labelledby={id}
      className={cn('border-t-2 border-dashed border-border', side ? 'pt-5' : 'pt-8')}
    >
      <h2 id={id} className={cn('font-display font-bold text-ink', side ? 'text-lg' : 'text-2xl')}>
        {title}
      </h2>
      {intro && <p className="mt-1 text-ink-soft">{intro}</p>}
      <div className={side ? 'mt-3' : 'mt-5'}>{children}</div>
    </section>
  );
}

/** Always rendered so screen readers announce the message when it appears. */
export function StatusMessage({
  message,
  tone = 'success',
}: {
  message?: string;
  tone?: 'success' | 'error';
}) {
  return (
    <div role="status" aria-live="polite">
      {message && (
        <p
          className={cn(
            'mt-3 font-medium',
            tone === 'success' ? 'text-mint-ink' : 'text-blush-ink',
          )}
        >
          <span>{message}</span>
        </p>
      )}
    </div>
  );
}

/** Inputs that look like a line to write on, as in a worksheet. */
export const blankInputClassName =
  'h-10 rounded-none border-0 border-b-2 border-input bg-transparent px-1 text-base shadow-none md:text-base focus-visible:border-forest focus-visible:bg-mint/40 focus-visible:ring-0';

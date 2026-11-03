import type { ReactNode } from 'react';

interface SectionCardProps {
  id: string;
  title: string;
  intro?: string;
  children: ReactNode;
}

/** One step of the lesson workflow: a titled, rounded card. */
export function SectionCard({ id, title, intro, children }: SectionCardProps) {
  return (
    <section aria-labelledby={id} className="rounded-3xl border bg-card p-5 shadow-soft sm:p-7">
      <h2 id={id} className="font-display text-xl font-bold text-ink">
        {title}
      </h2>
      {intro && <p className="mt-1 text-ink-soft">{intro}</p>}
      <div className="mt-5">{children}</div>
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
          className={
            tone === 'success'
              ? 'mt-3 rounded-2xl bg-mint px-4 py-2 font-medium text-mint-ink'
              : 'mt-3 rounded-2xl bg-blush px-4 py-2 font-medium text-blush-ink'
          }
        >
          {message}
        </p>
      )}
    </div>
  );
}

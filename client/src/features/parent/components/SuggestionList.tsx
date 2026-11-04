import { CheckCircleIcon, ClockIcon, SparkleIcon, type Icon } from '@phosphor-icons/react';
import { formatDate } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { text } from '@/text/sr-Latn';
import type { Suggestion } from '../types';

const statusAppearance: Record<Suggestion['status'], { icon: Icon; className: string }> = {
  'pending-teacher': { icon: ClockIcon, className: 'text-butter-ink' },
  'use-for-adaptation': { icon: SparkleIcon, className: 'text-lilac-ink' },
  read: { icon: CheckCircleIcon, className: 'text-mint-ink' },
};

interface SuggestionListProps {
  suggestions: readonly Suggestion[];
  lessonTitle: (lessonId: string) => string | undefined;
  /** Shown above the list; the suggestions page names the child instead. */
  heading?: string;
}

/** The parent's own suggestions with what the teacher did with each one. */
export function SuggestionList({
  suggestions,
  lessonTitle,
  heading = text.parent.suggestions.listHeading,
}: SuggestionListProps) {
  const t = text.parent.suggestions;
  if (suggestions.length === 0) return null;

  return (
    <section aria-label={heading} className="mt-8">
      <h3 className="font-display text-lg font-semibold text-ink">{heading}</h3>
      <ul className="mt-3 grid gap-3">
        {suggestions.map((suggestion) => {
          const title = suggestion.lessonId ? lessonTitle(suggestion.lessonId) : undefined;
          const { icon: StatusIcon, className } = statusAppearance[suggestion.status];
          return (
            <li key={suggestion.id} className="rounded-3xl bg-paper p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-display font-medium text-ink-soft">
                  {title ? t.forLesson(title) : t.general} · {formatDate(suggestion.createdAt)}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 font-display font-medium',
                    className,
                  )}
                >
                  <StatusIcon aria-hidden="true" weight="duotone" className="size-5" />
                  {text.suggestionStatus[suggestion.status]}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-line text-ink">{suggestion.text}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

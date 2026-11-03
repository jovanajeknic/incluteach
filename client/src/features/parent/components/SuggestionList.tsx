import { Clock } from 'lucide-react';
import { formatDate } from '@/shared/lib/format';
import { text } from '@/text/sr-Latn';
import type { Suggestion } from '../types';

interface SuggestionListProps {
  suggestions: readonly Suggestion[];
  lessonTitle: (lessonId: string) => string | undefined;
}

export function SuggestionList({ suggestions, lessonTitle }: SuggestionListProps) {
  const t = text.parent.suggestions;
  if (suggestions.length === 0) return null;

  return (
    <section aria-labelledby="suggestion-list-heading" className="mt-8">
      <h3 id="suggestion-list-heading" className="font-display text-lg font-bold text-ink">
        {t.listHeading}
      </h3>
      <ul className="mt-3 grid gap-3">
        {suggestions.map((suggestion) => {
          const title = suggestion.lessonId ? lessonTitle(suggestion.lessonId) : undefined;
          return (
            <li key={suggestion.id} className="rounded-2xl border border-border bg-paper p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-display font-medium text-ink-soft">
                  {title ? t.forLesson(title) : t.general} · {formatDate(suggestion.createdAt)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-butter px-3 py-1 font-display font-medium text-butter-ink">
                  <Clock aria-hidden="true" className="size-4" />
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

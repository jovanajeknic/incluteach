import { useState } from 'react';
import { useSchool } from '@/features/school/schoolContext';
import { teacherClassIds } from '@/features/school/types';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { cn } from '@/shared/lib/utils';
import { text } from '@/text/sr-Latn';
import { SuggestionItem } from '../components/SuggestionItem';

type Filter = 'new' | 'all';

export function SuggestionsInboxPage() {
  const t = text.suggestionsInbox;
  const school = useSchool();
  const [filter, setFilter] = useState<Filter>('new');
  // Only suggestions about the teacher's own students.
  const ownStudents = new Set(
    teacherClassIds(school.data.teacher).flatMap((id) => school.getClass(id)?.studentIds ?? []),
  );
  const suggestions = school.data.suggestions.filter(
    (item) =>
      ownStudents.has(item.childId) && (filter === 'all' || item.status === 'pending-teacher'),
  );

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <PageHeader title={t.heading} description={t.intro} />

      <div role="group" aria-label={t.filterLabel} className="mb-5 flex gap-2">
        {(['new', 'all'] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={filter === option}
            onClick={() => setFilter(option)}
            className={cn(
              'rounded-full border-2 px-4 py-2 font-display font-medium transition-colors',
              filter === option
                ? 'border-forest bg-mint text-mint-ink'
                : 'border-border bg-card text-ink hover:border-forest/40',
            )}
          >
            {option === 'new' ? t.filterNew : t.filterAll}
          </button>
        ))}
      </div>

      {suggestions.length === 0 ? (
        <EmptyState title={t.empty} />
      ) : (
        <ul className="grid gap-3">
          {suggestions.map((suggestion) => (
            <SuggestionItem key={suggestion.id} suggestion={suggestion} />
          ))}
        </ul>
      )}
    </>
  );
}

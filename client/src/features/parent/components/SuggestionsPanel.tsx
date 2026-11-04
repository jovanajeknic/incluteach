import { ChatsCircleIcon } from '@phosphor-icons/react';
import { cn } from '@/shared/lib/utils';
import { blobShape } from '@/shared/visual/subjectIcons';
import { text } from '@/text/sr-Latn';
import { useParent } from '../data/parentContext';
import type { ChildData } from '../types';
import { SuggestionForm } from './SuggestionForm';
import { SuggestionList } from './SuggestionList';

interface SuggestionsPanelProps {
  child: ChildData;
  /** When set, the suggestion is about this lesson; otherwise it is general. */
  lessonId?: string;
}

export function SuggestionsPanel({ child, lessonId }: SuggestionsPanelProps) {
  const t = text.parent.suggestions;
  const { suggestionsFor } = useParent();
  const lessonTitle = (id: string) => child.lessons.find((lesson) => lesson.id === id)?.title;

  return (
    <section
      aria-labelledby="suggestions-heading"
      className="rounded-[2rem] bg-card p-6 shadow-soft sm:p-8"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'flex size-12 shrink-0 items-center justify-center bg-blush text-blush-ink',
            blobShape,
          )}
        >
          <ChatsCircleIcon weight="duotone" className="size-7" />
        </span>
        <div>
          <h2 id="suggestions-heading" className="font-display text-2xl font-semibold text-ink">
            {t.heading}
          </h2>
          <p className="mt-1 text-ink-soft">{t.intro}</p>
          {lessonId && <p className="mt-1 text-ink-soft">{t.lessonIntro}</p>}
        </div>
      </div>
      <div className="mt-6">
        <SuggestionForm childId={child.profile.id} lessonId={lessonId} />
      </div>
      <SuggestionList
        suggestions={suggestionsFor(child.profile.id, lessonId)}
        lessonTitle={lessonTitle}
      />
    </section>
  );
}

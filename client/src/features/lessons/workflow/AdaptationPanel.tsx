import { Info, Loader2, MessageSquareHeart, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useSchool } from '@/features/school/schoolContext';
import type { SchoolLesson } from '@/features/school/types';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { SectionCard, StatusMessage } from './SectionCard';

export function AdaptationPanel({ lesson }: { lesson: SchoolLesson }) {
  const t = text.lessonDetail.adaptation;
  const school = useSchool();
  const [finished, setFinished] = useState(false);
  const needed = school.neededVersions(lesson);
  const suggestions = school.suggestionsForAdaptation(lesson);
  const processing = lesson.status === 'processing';
  const hasAiVersions = lesson.versions.some((version) => version.source === 'ai');

  async function start() {
    setFinished(false);
    await school.requestAdaptation(lesson.id);
    setFinished(true);
  }

  return (
    <SectionCard id="adaptation-heading" title={t.heading} intro={t.intro}>
      {needed.length === 0 ? (
        <p className="text-ink">{t.noneNeeded}</p>
      ) : (
        <ul className="grid gap-2">
          {needed.map(({ kind, studentCount }) => (
            <li key={kind} className="flex items-center gap-2 text-ink">
              <Sparkles aria-hidden="true" className="size-4 shrink-0 text-lilac-ink" />
              {kind === 'simplified'
                ? t.neededSimplified(studentCount)
                : t.neededExamples(studentCount)}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-ink-soft">{t.always}</p>

      {suggestions.length > 0 && (
        <div className="mt-4 rounded-2xl bg-blush p-4">
          <p className="flex items-center gap-2 font-medium text-blush-ink">
            <MessageSquareHeart aria-hidden="true" className="size-5" />
            {t.suggestionsIntro}
          </p>
          <ul className="mt-2 grid gap-1 text-ink">
            {suggestions.map((suggestion) => (
              <li key={suggestion.id}>
                <span className="font-medium">
                  {school.getStudent(suggestion.childId)?.firstName}:
                </span>{' '}
                {suggestion.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={start}
          disabled={processing}
          aria-busy={processing}
          className="h-11 px-5"
        >
          {processing ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <Sparkles aria-hidden="true" />
          )}
          {hasAiVersions ? t.again : t.start}
        </Button>
      </div>
      <StatusMessage message={processing ? t.processing : finished ? t.done : undefined} />
      <p className="mt-4 flex items-start gap-2 text-sm text-ink-soft">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {t.demoNote}
      </p>
    </SectionCard>
  );
}

import { Loader2 } from 'lucide-react';
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
    <SectionCard id="adaptation-heading" title={t.heading}>
      {needed.length === 0 ? (
        <p className="text-ink">{t.noneNeeded}</p>
      ) : (
        <>
          <p className="text-ink">{t.intro}</p>
          <ul className="mt-2 grid list-['–__'] gap-1 pl-5 text-ink">
            {needed.map(({ kind, studentCount }) => (
              <li key={kind}>
                {kind === 'simplified'
                  ? t.neededSimplified(studentCount)
                  : t.neededExamples(studentCount)}
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-3 text-ink-soft">{t.always}</p>

      {suggestions.length > 0 && (
        <blockquote className="mt-5 border-l-4 border-blush-deep pl-4">
          <p className="hand-note text-blush-ink">{t.suggestionsIntro}</p>
          <ul className="mt-1 grid gap-1 text-ink">
            {suggestions.map((suggestion) => (
              <li key={suggestion.id}>
                <span className="font-medium">
                  {school.getStudent(suggestion.childId)?.firstName}:
                </span>{' '}
                „{suggestion.text}“
              </li>
            ))}
          </ul>
        </blockquote>
      )}

      <Button
        type="button"
        onClick={start}
        disabled={processing}
        aria-busy={processing}
        className="mt-6 h-11 px-6"
      >
        {processing && <Loader2 aria-hidden="true" className="animate-spin" />}
        {hasAiVersions ? t.again : t.start}
      </Button>
      <StatusMessage message={processing ? t.processing : finished ? t.done : undefined} />
      <p className="mt-4 text-sm text-ink-soft">{t.demoNote}</p>
    </SectionCard>
  );
}

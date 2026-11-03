import { useId, useState } from 'react';
import { useSchool } from '@/features/school/schoolContext';
import type { SchoolLesson } from '@/features/school/types';
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';
import { text } from '@/text/sr-Latn';
import { SectionCard, StatusMessage } from './SectionCard';

/** Short tips for parents; one tip per line keeps editing simple. */
export function HomeGuidanceEditor({ lesson }: { lesson: SchoolLesson }) {
  const t = text.lessonDetail.home;
  const { updateLesson } = useSchool();
  const [value, setValue] = useState((lesson.homeGuidance ?? []).join('\n'));
  const [saved, setSaved] = useState(false);
  const fieldId = useId();

  function save() {
    const tips = value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    updateLesson(lesson.id, { homeGuidance: tips });
    setValue(tips.join('\n'));
    setSaved(true);
  }

  return (
    <SectionCard id="home-guidance-heading" title={t.heading} intro={t.intro}>
      <label htmlFor={fieldId} className="text-sm font-medium text-ink">
        {t.label}
      </label>
      <Textarea
        id={fieldId}
        rows={4}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setSaved(false);
        }}
        className="mt-1 min-h-28 bg-card text-base md:text-base"
      />
      <Button type="button" onClick={save} className="mt-3 h-10 px-4">
        {text.lessonDetail.saveSection}
      </Button>
      <StatusMessage message={saved ? text.lessonDetail.sectionSaved : undefined} />
    </SectionCard>
  );
}

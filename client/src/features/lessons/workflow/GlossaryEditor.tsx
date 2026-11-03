import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useSchool } from '@/features/school/schoolContext';
import type { SchoolLesson } from '@/features/school/types';
import type { GlossaryEntry } from '@/features/student/types';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { text } from '@/text/sr-Latn';
import { SectionCard, StatusMessage } from './SectionCard';

const fieldClassName = 'h-11 bg-card text-base md:text-base';

/** Harder words and their explanations. Local edits are saved together, then need approval. */
export function GlossaryEditor({ lesson }: { lesson: SchoolLesson }) {
  const t = text.lessonDetail.glossary;
  const { updateLesson } = useSchool();
  const [entries, setEntries] = useState<GlossaryEntry[]>(lesson.glossary);
  const [message, setMessage] = useState<{ text: string; tone: 'success' | 'error' }>();

  function change(index: number, field: keyof GlossaryEntry, value: string) {
    setEntries((current) =>
      current.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)),
    );
    setMessage(undefined);
  }

  function save() {
    const cleaned = entries.map((entry) => ({
      term: entry.term.trim(),
      definition: entry.definition.trim(),
    }));
    if (cleaned.some((entry) => !entry.term || !entry.definition)) {
      setMessage({ text: text.lessonDetail.sectionInvalid, tone: 'error' });
      return;
    }
    updateLesson(lesson.id, { glossary: cleaned });
    setMessage({ text: text.lessonDetail.sectionSaved, tone: 'success' });
  }

  return (
    <SectionCard id="glossary-heading" title={t.heading} intro={t.intro}>
      {entries.length === 0 ? (
        <p className="text-ink-soft">{t.empty}</p>
      ) : (
        <ul className="grid gap-4">
          {entries.map((entry, index) => (
            <li
              key={index}
              className="grid gap-2 rounded-2xl bg-paper p-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end"
            >
              <label className="flex flex-col gap-1 text-sm font-medium text-ink">
                {t.term(index + 1)}
                <Input
                  value={entry.term}
                  onChange={(event) => change(index, 'term', event.target.value)}
                  className={fieldClassName}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-ink">
                {t.definition(index + 1)}
                <Input
                  value={entry.definition}
                  onChange={(event) => change(index, 'definition', event.target.value)}
                  className={fieldClassName}
                />
              </label>
              <Button
                type="button"
                variant="outline"
                aria-label={t.remove(index + 1)}
                onClick={() => {
                  setEntries((current) => current.filter((_, i) => i !== index));
                  setMessage(undefined);
                }}
                className="h-11 px-3"
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setEntries((current) => [...current, { term: '', definition: '' }])}
          className="h-10 px-4"
        >
          <Plus aria-hidden="true" />
          {t.add}
        </Button>
        <Button type="button" onClick={save} className="h-10 px-4">
          {text.lessonDetail.saveSection}
        </Button>
      </div>
      <StatusMessage message={message?.text} tone={message?.tone} />
    </SectionCard>
  );
}

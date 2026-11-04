import { X } from 'lucide-react';
import { useState } from 'react';
import { useSchool } from '@/features/school/schoolContext';
import type { SchoolLesson } from '@/features/school/types';
import type { GlossaryEntry } from '@/features/student/types';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { text } from '@/text/sr-Latn';
import { blankInputClassName, SectionCard, StatusMessage } from './SectionCard';

/** Harder words and their explanations, written like a small two-column glossary. */
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
        <p className="hand-note text-ink-soft">{t.empty}</p>
      ) : (
        <ul className="grid gap-3">
          {entries.map((entry, index) => (
            <li
              key={index}
              className="grid items-end gap-x-4 gap-y-1 sm:grid-cols-[12rem_1fr_auto]"
            >
              <label className="flex flex-col text-sm text-ink-soft">
                <span className="sr-only">{t.term(index + 1)}</span>
                <Input
                  aria-label={t.term(index + 1)}
                  value={entry.term}
                  onChange={(event) => change(index, 'term', event.target.value)}
                  className={`${blankInputClassName} font-display font-medium`}
                />
              </label>
              <label className="flex flex-col text-sm text-ink-soft">
                <span className="sr-only">{t.definition(index + 1)}</span>
                <Input
                  aria-label={t.definition(index + 1)}
                  value={entry.definition}
                  onChange={(event) => change(index, 'definition', event.target.value)}
                  className={blankInputClassName}
                />
              </label>
              <button
                type="button"
                aria-label={t.remove(index + 1)}
                onClick={() => {
                  setEntries((current) => current.filter((_, i) => i !== index));
                  setMessage(undefined);
                }}
                className="mb-1 justify-self-start rounded-full p-1.5 text-ink-soft hover:bg-blush hover:text-blush-ink"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => setEntries((current) => [...current, { term: '', definition: '' }])}
          className="rounded-sm font-medium text-forest underline underline-offset-4 hover:text-forest-deep"
        >
          {t.add}
        </button>
        <Button type="button" variant="outline" onClick={save} className="h-9 px-4">
          {text.lessonDetail.saveSection}
        </Button>
      </div>
      <StatusMessage message={message?.text} tone={message?.tone} />
    </SectionCard>
  );
}

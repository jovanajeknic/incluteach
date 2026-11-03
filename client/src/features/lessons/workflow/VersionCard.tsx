import { CheckCircle2, Pencil, Sparkles, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { LessonContent } from '@/features/lesson-content/LessonContent';
import { useSchool } from '@/features/school/schoolContext';
import type { SchoolLesson } from '@/features/school/types';
import type { LessonVersion } from '@/features/student/types';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';
import { text } from '@/text/sr-Latn';

interface VersionCardProps {
  lesson: SchoolLesson;
  version: LessonVersion;
}

/** One version of the lesson, readable or editable. AI versions stay labelled until approved. */
export function VersionCard({ lesson, version }: VersionCardProps) {
  const t = text.lessonDetail.versions;
  const { updateVersionContent, removeVersion } = useSchool();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(version.content);
  const [error, setError] = useState<string>();
  const fieldId = useId();
  const errorId = useId();
  const kindLabel = t.kinds[version.kind];
  const pending = !version.approvedByTeacher;

  function save() {
    if (!draft.trim()) {
      setError(t.emptyError);
      return;
    }
    updateVersionContent(lesson.id, version.kind, draft.trim());
    setError(undefined);
    setEditing(false);
  }

  return (
    <article
      aria-label={kindLabel}
      className={cn(
        'flex flex-col rounded-2xl border p-4 sm:p-5',
        pending ? 'border-butter-deep bg-butter/40' : 'bg-paper',
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-bold text-ink">{kindLabel}</h3>
        {pending ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-butter px-2.5 py-1 text-sm text-butter-ink">
            <Sparkles aria-hidden="true" className="size-3.5" />
            {t.aiPending}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-mint px-2.5 py-1 text-sm text-mint-ink">
            <CheckCircle2 aria-hidden="true" className="size-3.5" />
            {t.approved}
          </span>
        )}
      </header>

      <div className="mt-4 flex-1">
        {editing ? (
          <div className="flex flex-col gap-2">
            <label htmlFor={fieldId} className="text-sm font-medium text-ink">
              {t.editLabel(kindLabel)}
            </label>
            <Textarea
              id={fieldId}
              rows={10}
              value={draft}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              onChange={(event) => setDraft(event.target.value)}
              className="min-h-60 bg-card text-base leading-relaxed md:text-base"
            />
            {error && (
              <p id={errorId} className="text-sm font-medium text-destructive">
                {error}
              </p>
            )}
          </div>
        ) : (
          <LessonContent
            content={version.content}
            glossary={lesson.glossary}
            className="text-base"
          />
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {editing ? (
          <>
            <Button type="button" onClick={save} className="h-10 px-4">
              {t.save}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraft(version.content);
                setError(undefined);
                setEditing(false);
              }}
              className="h-10 px-4"
            >
              {t.cancel}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setDraft(version.content);
              setEditing(true);
            }}
            className="h-10 px-4"
            aria-label={`${t.edit}: ${kindLabel}`}
          >
            <Pencil aria-hidden="true" />
            {t.edit}
          </Button>
        )}
        {version.kind !== 'standard' && !editing && (
          <Button
            type="button"
            variant="outline"
            onClick={() => removeVersion(lesson.id, version.kind)}
            className="h-10 px-4"
            aria-label={`${t.remove}: ${kindLabel}`}
          >
            <Trash2 aria-hidden="true" />
            {t.remove}
          </Button>
        )}
      </div>
    </article>
  );
}

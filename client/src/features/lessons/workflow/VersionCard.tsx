import { useId, useState } from 'react';
import { LessonContent } from '@/features/lesson-content/LessonContent';
import { useSchool } from '@/features/school/schoolContext';
import type { SchoolLesson } from '@/features/school/types';
import type { LessonVersion } from '@/features/student/types';
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';
import { text } from '@/text/sr-Latn';

interface VersionCardProps {
  lesson: SchoolLesson;
  version: LessonVersion;
}

/**
 * One version of the lesson as a sheet of paper. AI suggestions carry a handwritten
 * "not approved" note until the teacher approves them.
 */
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
    <div className="paper-stack">
      <article
        aria-label={kindLabel}
        className="paper-sheet flex h-full flex-col bg-card py-5 pr-5"
      >
        <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="font-display text-lg font-bold text-ink">{kindLabel}</h3>
          {pending ? (
            <span className="hand-note rounded-sm bg-butter px-2 text-lg text-butter-ink">
              {t.aiPending}
            </span>
          ) : (
            <span className="hand-note text-lg text-mint-ink">✓ {t.approved}</span>
          )}
        </header>

        <div className="mt-3 flex-1">
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
                className="min-h-60 rounded-md bg-paper text-base leading-relaxed md:text-base"
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

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {editing ? (
            <>
              <Button type="button" onClick={save} className="h-9 px-4">
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
                className="h-9 px-4"
              >
                {t.cancel}
              </Button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setDraft(version.content);
                  setEditing(true);
                }}
                aria-label={`${t.edit}: ${kindLabel}`}
                className="rounded-sm font-medium text-forest underline underline-offset-4 hover:text-forest-deep"
              >
                {t.edit}
              </button>
              {version.kind !== 'standard' && (
                <button
                  type="button"
                  onClick={() => removeVersion(lesson.id, version.kind)}
                  aria-label={`${t.remove}: ${kindLabel}`}
                  className="rounded-sm font-medium text-blush-ink underline underline-offset-4 hover:text-ink"
                >
                  {t.remove}
                </button>
              )}
            </>
          )}
        </div>
      </article>
    </div>
  );
}

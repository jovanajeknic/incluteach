import { Check, Clock, Sparkles } from 'lucide-react';
import { useId, useState } from 'react';
import { Link } from 'react-router';
import { lessonPath } from '@/features/lessons/paths';
import { useSchool } from '@/features/school/schoolContext';
import type { Suggestion } from '@/features/school/types';
import { formatDate } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';
import { text } from '@/text/sr-Latn';

const statusStyle: Record<Suggestion['status'], string> = {
  'pending-teacher': 'bg-butter text-butter-ink',
  'use-for-adaptation': 'bg-lilac text-lilac-ink',
  read: 'bg-mint text-mint-ink',
};

const statusIcon = {
  'pending-teacher': Clock,
  'use-for-adaptation': Sparkles,
  read: Check,
} as const;

/** A parent suggestion as the teacher sees it, with actions. */
export function SuggestionItem({
  suggestion,
  showStudent = true,
}: {
  suggestion: Suggestion;
  showStudent?: boolean;
}) {
  const t = text.suggestionsInbox;
  const school = useSchool();
  const student = school.getStudent(suggestion.childId);
  const lesson = suggestion.lessonId ? school.getLesson(suggestion.lessonId) : undefined;
  const Icon = statusIcon[suggestion.status];
  const [writing, setWriting] = useState(false);
  const studentName = student ? `${student.firstName} ${student.lastName}` : '';

  return (
    <li className="rounded-2xl border bg-card p-4 shadow-soft sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-display font-medium text-ink-soft">
          {showStudent && <>{t.forStudent(studentName)} · </>}
          {lesson ? (
            <Link
              to={lessonPath(lesson.id)}
              className="text-forest underline-offset-4 hover:underline"
            >
              {text.parent.suggestions.forLesson(lesson.title)}
            </Link>
          ) : (
            text.parent.suggestions.general
          )}{' '}
          · {formatDate(suggestion.createdAt)}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-display font-medium',
            statusStyle[suggestion.status],
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
          {text.suggestionStatus[suggestion.status]}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-line text-ink">{suggestion.text}</p>
      {suggestion.aiNote && (
        <p className="mt-2 text-sm font-medium text-lilac-ink">
          {t.aiNoteShown(suggestion.aiNote)}
        </p>
      )}
      {writing && (
        <AiNoteForm
          onSave={(note) => {
            school.useSuggestionForAi(suggestion.id, note);
            setWriting(false);
          }}
          onCancel={() => setWriting(false)}
        />
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {suggestion.status !== 'use-for-adaptation' && !writing && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setWriting(true)}
            className="h-10 px-4"
          >
            <Sparkles aria-hidden="true" />
            {t.useForAdaptation}
          </Button>
        )}
        {suggestion.status === 'pending-teacher' && (
          <Button
            type="button"
            variant="outline"
            onClick={() => school.setSuggestionStatus(suggestion.id, 'read')}
            className="h-10 px-4"
          >
            <Check aria-hidden="true" />
            {t.markRead}
          </Button>
        )}
      </div>
    </li>
  );
}

/** The teacher's own, anonymous instruction for the AI, written because of the suggestion. */
function AiNoteForm({
  onSave,
  onCancel,
}: {
  onSave: (note: string) => void;
  onCancel: () => void;
}) {
  const t = text.suggestionsInbox;
  const [note, setNote] = useState('');
  const [error, setError] = useState<string>();
  const fieldId = useId();
  const hintId = useId();
  const errorId = useId();

  return (
    <div className="mt-3 rounded-2xl bg-lilac/50 p-4">
      <label htmlFor={fieldId} className="font-display font-semibold text-ink">
        {t.aiNoteLabel}
      </label>
      <p id={hintId} className="mt-1 text-sm text-ink-soft">
        {t.aiNoteHint}
      </p>
      <Textarea
        id={fieldId}
        rows={2}
        value={note}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${hintId} ${errorId}` : hintId}
        onChange={(event) => {
          setNote(event.target.value);
          setError(undefined);
        }}
        className="mt-2 rounded-2xl bg-card text-base md:text-base"
      />
      {error && (
        <p id={errorId} className="mt-1 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => {
            if (!note.trim()) {
              setError(t.aiNoteRequired);
              return;
            }
            onSave(note.trim());
          }}
          className="h-10 px-4"
        >
          {t.saveAiNote}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="h-10 px-4">
          {t.cancelAiNote}
        </Button>
      </div>
    </div>
  );
}

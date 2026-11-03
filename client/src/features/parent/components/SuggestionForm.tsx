import { CheckCircle2, Lock, Send } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { FormField } from '@/shared/components/FormField';
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';
import { text } from '@/text/sr-Latn';
import { useParent } from '../data/parentContext';

const MAX_LENGTH = 1000;

interface SuggestionFormProps {
  childId: string;
  lessonId?: string;
}

/**
 * Free-text suggestion for the teacher. In the demo it is only kept in memory:
 * nothing is sent over the network.
 */
export function SuggestionForm({ childId, lessonId }: SuggestionFormProps) {
  const t = text.parent.suggestions;
  const { addSuggestion } = useParent();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const fieldId = lessonId ? `suggestion-${lessonId}` : 'suggestion-general';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    const problem = !trimmed
      ? t.required
      : trimmed.length > MAX_LENGTH
        ? t.tooLong(MAX_LENGTH)
        : undefined;
    if (problem) {
      setError(problem);
      setSent(false);
      fieldRef.current?.focus();
      return;
    }
    addSuggestion({ childId, lessonId, text: trimmed });
    setValue('');
    setError(undefined);
    setSent(true);
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField id={fieldId} label={t.label} hint={t.hint} error={error} required>
        {(props) => (
          <Textarea
            {...props}
            ref={fieldRef}
            rows={4}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setSent(false);
            }}
            className="min-h-32 bg-card text-base md:text-base"
          />
        )}
      </FormField>
      <p className="flex items-center gap-2 text-sm text-ink-soft">
        <Lock aria-hidden="true" className="size-4 shrink-0" />
        {t.privacy}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="submit" className="h-11 px-5">
          <Send aria-hidden="true" />
          {t.submit}
        </Button>
      </div>
      {/* Always rendered so the confirmation is announced when it appears. */}
      <div role="status" aria-live="polite">
        {sent && (
          <p className="flex items-start gap-2 rounded-2xl bg-mint px-4 py-3 font-medium text-mint-ink">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            {t.demoSent}
          </p>
        )}
      </div>
    </form>
  );
}

import { CheckCircle2, Info, Loader2, TriangleAlert } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';

export function DemoNotice() {
  return (
    <p
      role="note"
      className="flex items-start gap-2 rounded-2xl bg-lilac px-4 py-3 text-sm font-medium text-lilac-ink"
    >
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {text.auth.demoNotice}
    </p>
  );
}

export type SubmitOutcome = { kind: 'demo-success'; message: string } | { kind: 'error' } | null;

/**
 * Always rendered, so screen readers announce the message when it appears
 * (a live region added together with its content is often not announced).
 */
export function SubmitOutcomeMessage({ outcome }: { outcome: SubmitOutcome }) {
  return (
    <div role="status" aria-live="polite">
      {outcome?.kind === 'demo-success' && (
        <p className="flex items-start gap-2 rounded-2xl bg-mint px-4 py-3 font-medium text-mint-ink">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          {outcome.message}
        </p>
      )}
      {outcome?.kind === 'error' && (
        <p className="flex items-start gap-2 rounded-2xl bg-blush px-4 py-3 font-medium text-blush-ink">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          {text.auth.errors.submitFailed}
        </p>
      )}
    </div>
  );
}

interface SubmitButtonProps {
  label: string;
  pendingLabel: string;
  pending: boolean;
}

/** Disabled while sending, which also stops a second submit with Enter. */
export function SubmitButton({ label, pendingLabel, pending }: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      aria-busy={pending}
      className="h-12 w-full text-base"
    >
      {pending && <Loader2 aria-hidden="true" className="size-5 animate-spin" />}
      {pending ? pendingLabel : label}
    </Button>
  );
}

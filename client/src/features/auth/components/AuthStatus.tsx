import { CheckCircleIcon, CircleNotchIcon, WarningIcon } from '@phosphor-icons/react';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';

/** `demo-success` is for the school request form, which is still a demo and sends nothing. */
export type SubmitOutcome =
  { kind: 'demo-success'; message: string } | { kind: 'error'; message?: string } | null;

/**
 * Always rendered, so screen readers announce the message when it appears
 * (a live region added together with its content is often not announced).
 */
export function SubmitOutcomeMessage({ outcome }: { outcome: SubmitOutcome }) {
  return (
    <div role="status" aria-live="polite">
      {outcome?.kind === 'demo-success' && (
        <p className="flex items-start gap-2 rounded-2xl bg-mint px-4 py-3 font-medium text-mint-ink">
          <CheckCircleIcon aria-hidden="true" weight="fill" className="mt-0.5 size-5 shrink-0" />
          {outcome.message}
        </p>
      )}
      {outcome?.kind === 'error' && (
        <p className="flex items-start gap-2 rounded-2xl bg-blush px-4 py-3 font-medium text-blush-ink">
          <WarningIcon aria-hidden="true" weight="fill" className="mt-0.5 size-5 shrink-0" />
          {outcome.message ?? text.auth.apiErrors.unknown_error}
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
      {pending && (
        <CircleNotchIcon aria-hidden="true" weight="bold" className="size-5 animate-spin" />
      )}
      {pending ? pendingLabel : label}
    </Button>
  );
}

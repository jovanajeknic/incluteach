import { CircleNotchIcon } from '@phosphor-icons/react';

/** A calm waiting indicator that screen readers announce (role="status"). */
export function LoadingState({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-24 text-ink-soft">
      <CircleNotchIcon aria-hidden="true" weight="bold" className="size-6 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

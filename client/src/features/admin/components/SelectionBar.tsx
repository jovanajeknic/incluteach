import { useState } from 'react';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { useChangeUsers } from '../api/queries';
import type { BulkAction, ManagedUser } from '../api/usersApi';
import { adminErrorMessage } from '../apiErrorMessage';

const t = text.admin.users;

interface SelectionBarProps {
  selected: ManagedUser[];
  onClear: () => void;
  /** What happened, or why it did not; shown by the page, which outlives this bar. */
  onNotice: (message: string) => void;
  onProblem: (message: string) => void;
}

/**
 * What can be done with the marked users. The ids sent are only those the action applies to
 * (a deactivated person is not deactivated again), so "skipped" stays rare.
 */
export function SelectionBar({ selected, onClear, onNotice, onProblem }: SelectionBarProps) {
  const change = useChangeUsers();
  const [confirm, setConfirm] = useState<'deactivate' | 'delete' | null>(null);

  const active = selected.filter((user) => !user.deactivatedAt);
  const deactivated = selected.filter((user) => user.deactivatedAt);

  async function run(action: BulkAction, users: ManagedUser[]) {
    setConfirm(null);
    try {
      const result = await change.mutateAsync({ action, ids: users.map((user) => user.id) });
      const done = {
        deactivate: t.deactivatedDone,
        reactivate: t.reactivatedDone,
        delete: t.removedDone,
      }[action](result.affectedIds.length);
      const skipped = result.skippedIds.length > 0 ? ` ${t.skipped(result.skippedIds.length)}` : '';
      onNotice(done + skipped);
      onClear();
    } catch (error) {
      onProblem(adminErrorMessage(error));
    }
  }

  return (
    <div
      role="group"
      aria-label={t.selectedCount(selected.length)}
      className="mt-4 flex max-w-4xl flex-wrap items-center gap-3 rounded-2xl bg-lilac px-5 py-4 text-lilac-ink"
    >
      <p className="mr-2 font-display text-lg font-semibold">{t.selectedCount(selected.length)}</p>
      {active.length > 0 && (
        <Button
          type="button"
          size="lg"
          disabled={change.isPending}
          onClick={() => setConfirm('deactivate')}
        >
          {t.deactivate(active.length)}
        </Button>
      )}
      {deactivated.length > 0 && (
        <Button
          type="button"
          size="lg"
          disabled={change.isPending}
          onClick={() => void run('reactivate', deactivated)}
        >
          {t.reactivate(deactivated.length)}
        </Button>
      )}
      {deactivated.length > 0 && (
        <Button
          type="button"
          variant="destructive"
          size="lg"
          // Only deactivated people can be erased; a mixed choice is refused here, not by the server.
          disabled={change.isPending || active.length > 0}
          onClick={() => setConfirm('delete')}
        >
          {t.remove(deactivated.length)}
        </Button>
      )}
      <Button type="button" variant="outline" size="lg" onClick={onClear}>
        {t.clearSelection}
      </Button>
      {deactivated.length > 0 && active.length > 0 && (
        <p className="basis-full text-sm">{t.removeNeedsDeactivated}</p>
      )}
      {change.isPending && (
        <p role="status" className="basis-full text-sm">
          {t.working}
        </p>
      )}

      <ConfirmDialog
        open={confirm === 'deactivate'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={t.confirmDeactivateTitle}
        description={t.confirmDeactivate(active.length)}
        confirmLabel={t.confirmDeactivateYes}
        cancelLabel={t.cancel}
        onConfirm={() => void run('deactivate', active)}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={t.confirmRemoveTitle}
        description={t.confirmRemove(deactivated.length)}
        confirmLabel={t.confirmRemoveYes}
        cancelLabel={t.cancel}
        destructive
        onConfirm={() => void run('delete', deactivated)}
      />
    </div>
  );
}

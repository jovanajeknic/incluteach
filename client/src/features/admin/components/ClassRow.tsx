import { useState } from 'react';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { text } from '@/text/sr-Latn';
import type { SchoolClass } from '../api/classesApi';
import { useDeleteClass, useRenameClass } from '../api/queries';
import { adminErrorMessage } from '../apiErrorMessage';
import { className } from '../schemas';

const t = text.admin.classes;

interface ClassRowProps {
  item: SchoolClass;
  onNotice: (message: string) => void;
  onProblem: (message: string) => void;
}

export function ClassRow({ item, onNotice, onProblem }: ClassRowProps) {
  const [renaming, setRenaming] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const deleteClass = useDeleteClass();
  // Only a class without subjects can go; the server would refuse the rest.
  const canRemove = item.subjectCount === 0;

  async function remove() {
    setConfirmRemove(false);
    try {
      await deleteClass.mutateAsync(item.id);
      onNotice(t.removed(item.name));
    } catch (error) {
      onProblem(adminErrorMessage(error));
    }
  }

  return (
    <div className="rounded-2xl bg-card px-5 py-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold break-words text-ink">{item.name}</p>
          <p className="text-sm text-ink-soft">{t.subjectCount(item.subjectCount)}</p>
          {!canRemove && <p className="text-sm text-ink-soft">{t.removeBlocked}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            aria-label={t.renameFor(item.name)}
            onClick={() => setRenaming((current) => !current)}
          >
            {t.rename}
          </Button>
          {canRemove && (
            <ConfirmDialog
              open={confirmRemove}
              onOpenChange={setConfirmRemove}
              trigger={
                <Button
                  type="button"
                  variant="outline"
                  aria-label={t.removeFor(item.name)}
                  disabled={deleteClass.isPending}
                >
                  {t.remove}
                </Button>
              }
              title={t.confirmRemoveTitle(item.name)}
              description={t.confirmRemove}
              confirmLabel={t.confirmRemoveYes}
              cancelLabel={t.cancel}
              destructive
              onConfirm={() => void remove()}
            />
          )}
        </div>
      </div>
      {renaming && <RenameForm item={item} onDone={() => setRenaming(false)} />}
    </div>
  );
}

function RenameForm({ item, onDone }: { item: SchoolClass; onDone: () => void }) {
  const rename = useRenameClass();
  const [value, setValue] = useState(item.name);
  const [problem, setProblem] = useState<string | null>(null);
  const id = `rename-class-${item.id}`;

  async function save() {
    const checked = className.safeParse(value);
    if (!checked.success) {
      setProblem(checked.error.issues[0]?.message ?? null);
      return;
    }
    setProblem(null);
    try {
      await rename.mutateAsync({ id: item.id, name: checked.data });
      onDone();
    } catch (error) {
      setProblem(adminErrorMessage(error));
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      className="mt-4 grid max-w-xl gap-2 border-t border-border pt-4"
    >
      <Label htmlFor={id} className="text-base">
        {t.nameLabel}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-invalid={Boolean(problem)}
        aria-describedby={problem ? `${id}-error` : undefined}
        autoComplete="off"
        className="h-12 rounded-xl bg-card text-base md:text-base"
      />
      {problem && (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-destructive">
          {problem}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={rename.isPending}>
          {rename.isPending ? t.saving : t.save}
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}

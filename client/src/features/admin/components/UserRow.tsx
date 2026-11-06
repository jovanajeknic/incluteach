import { useState } from 'react';
import { formatDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { text } from '@/text/sr-Latn';
import { useIssueActivation, useRenameUser } from '../api/queries';
import type { ManagedUser } from '../api/usersApi';
import { adminErrorMessage } from '../apiErrorMessage';
import { newUserSchema } from '../schemas';
import { ActivationLink } from './ActivationLink';

const t = text.admin.users;

/** Words, not only colours, tell the state apart. */
function Chip({ children, tone }: { children: string; tone: string }) {
  return <span className={`rounded-full px-3 py-1 text-sm font-medium ${tone}`}>{children}</span>;
}

interface UserRowProps {
  user: ManagedUser;
  /** `null` for the person who is signed in: they cannot deactivate or delete themselves. */
  selected: boolean | null;
  onSelect: (selected: boolean) => void;
}

export function UserRow({ user, selected, onSelect }: UserRowProps) {
  const issue = useIssueActivation();
  const [renaming, setRenaming] = useState(false);
  const link = issue.data?.activation;
  // A person who left the school cannot sign in again until they are brought back.
  const canGetLink = !user.deactivatedAt;

  return (
    <div className="rounded-2xl bg-card px-5 py-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 items-start gap-4">
          {selected !== null && (
            <input
              type="checkbox"
              checked={selected}
              onChange={(event) => onSelect(event.target.checked)}
              aria-label={t.selectOne(user.fullName)}
              className="mt-1.5 size-5 shrink-0 accent-forest"
            />
          )}
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold break-words text-ink">
              {user.fullName}
            </p>
            <p className="text-sm text-ink-soft">{t.username(user.username)}</p>
            <p className="text-sm text-ink-soft">{user.email ?? t.noEmail}</p>
            <p className="text-sm text-ink-soft">{t.createdOn(formatDate(user.createdAt))}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="bg-lilac text-lilac-ink">{text.admin.roles[user.role]}</Chip>
          {user.deactivatedAt ? (
            <Chip tone="bg-blush text-blush-ink">{t.deactivated}</Chip>
          ) : (
            !user.activated && <Chip tone="bg-butter text-butter-ink">{t.notActivated}</Chip>
          )}
          <Button
            type="button"
            variant="outline"
            aria-label={t.renameFor(user.fullName)}
            onClick={() => setRenaming((current) => !current)}
          >
            {t.rename}
          </Button>
          {canGetLink && (
            <Button
              type="button"
              variant="outline"
              aria-label={t.newLinkFor(user.fullName)}
              disabled={issue.isPending}
              onClick={() => issue.mutate(user.id)}
            >
              {issue.isPending ? t.issuing : t.newLink}
            </Button>
          )}
        </div>
      </div>
      {renaming && <RenameForm user={user} onDone={() => setRenaming(false)} />}
      {issue.isError && (
        <p role="alert" className="mt-3 font-medium text-blush-ink">
          {adminErrorMessage(issue.error)}
        </p>
      )}
      {link && (
        <div className="mt-4 border-t border-border pt-4">
          <ActivationLink activation={link} person={user} />
          <Button type="button" variant="ghost" className="mt-3" onClick={() => issue.reset()}>
            {text.admin.link.hide}
          </Button>
        </div>
      )}
    </div>
  );
}

/** A name can be fixed; the username stays as it was. */
function RenameForm({ user, onDone }: { user: ManagedUser; onDone: () => void }) {
  const rename = useRenameUser();
  const [value, setValue] = useState(user.fullName);
  const [problem, setProblem] = useState<string | null>(null);
  const id = `rename-${user.id}`;

  async function save() {
    const checked = newUserSchema.shape.fullName.safeParse(value);
    if (!checked.success) {
      setProblem(checked.error.issues[0]?.message ?? null);
      return;
    }
    setProblem(null);
    try {
      await rename.mutateAsync({ id: user.id, fullName: checked.data });
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
        {t.renameLabel}
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
          {rename.isPending ? t.renameSaving : t.renameSave}
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {t.renameCancel}
        </Button>
      </div>
    </form>
  );
}

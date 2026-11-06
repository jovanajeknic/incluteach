import { useState } from 'react';
import type { Role } from '@/features/auth/api/authApi';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { useDebounced } from '@/shared/lib/useDebounced';
import { useSession } from '@/features/auth/api/session';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { text } from '@/text/sr-Latn';
import { USERS_PAGE_SIZE, useUsers } from '../api/queries';
import type { UserStatus } from '../api/usersApi';
import { SelectionBar } from '../components/SelectionBar';
import { UserRow } from '../components/UserRow';

const t = text.admin.users;
const roles: readonly Role[] = ['teacher', 'student', 'parent', 'admin'];
const statuses: readonly UserStatus[] = ['active', 'deactivated', 'all'];

/** "Korisnici": the accounts of the school, with the filters an administrator needs most. */
export function UsersPage() {
  const [role, setRole] = useState<Role | ''>('');
  const [status, setStatus] = useState<UserStatus>('active');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(USERS_PAGE_SIZE);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  // What an action did or why it failed; kept here because the marked rows are gone after it.
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const { user: me } = useSession();

  const query = useDebounced(search.trim());
  const users = useUsers({
    role: role || undefined,
    status,
    search: query || undefined,
    limit,
  });
  const filtered = Boolean(role || query || status !== 'active');

  /** A new filter shows other people, so what was marked must not be acted on unseen. */
  function resetView() {
    setLimit(USERS_PAGE_SIZE);
    setSelectedIds(new Set());
    setNotice(null);
    setProblem(null);
  }

  const shown = users.data?.users ?? [];
  // Nobody can deactivate or delete themselves, so they get no checkbox.
  const selectable = shown.filter((user) => user.id !== me?.id);
  const selected = shown.filter((user) => selectedIds.has(user.id));
  const allMarked = selectable.length > 0 && selectable.every((user) => selectedIds.has(user.id));

  function mark(id: string, marked: boolean) {
    setNotice(null);
    setProblem(null);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (marked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">{t.heading}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{t.intro}</p>

      <div className="mt-6 grid max-w-4xl gap-4 sm:grid-cols-[12rem_12rem_1fr]">
        <div className="grid gap-2">
          <Label htmlFor="users-role" className="text-base">
            {t.roleLabel}
          </Label>
          <NativeSelect
            id="users-role"
            value={role}
            onChange={(event) => {
              setRole(event.target.value as Role | '');
              resetView();
            }}
            className="h-12 rounded-xl bg-card text-base"
          >
            <NativeSelectOption value="">{t.roleAll}</NativeSelectOption>
            {roles.map((item) => (
              <NativeSelectOption key={item} value={item}>
                {text.admin.roles[item]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="users-status" className="text-base">
            {t.statusLabel}
          </Label>
          <NativeSelect
            id="users-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as UserStatus);
              resetView();
            }}
            className="h-12 rounded-xl bg-card text-base"
          >
            {statuses.map((item) => (
              <NativeSelectOption key={item} value={item}>
                {t.status[item]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="users-search" className="text-base">
            {t.searchLabel}
          </Label>
          <Input
            id="users-search"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              resetView();
            }}
            autoComplete="off"
            className="h-12 rounded-xl bg-card text-base md:text-base"
          />
        </div>
      </div>

      <div role="status" aria-live="polite" className="mt-4 max-w-4xl empty:hidden">
        {notice && (
          <p className="rounded-2xl bg-mint px-4 py-3 font-medium text-mint-ink">{notice}</p>
        )}
      </div>
      {problem && (
        <p
          role="alert"
          className="mt-4 max-w-4xl rounded-2xl bg-blush px-4 py-3 font-medium text-blush-ink"
        >
          {problem}
        </p>
      )}
      {selected.length > 0 && (
        <SelectionBar
          selected={selected}
          onClear={() => setSelectedIds(new Set())}
          onNotice={(message) => {
            setProblem(null);
            setNotice(message);
          }}
          onProblem={(message) => {
            setNotice(null);
            setProblem(message);
          }}
        />
      )}

      <section aria-label={t.resultsLabel} className="mt-6 max-w-4xl">
        {users.isPending ? (
          <LoadingState label={text.admin.load.loading} />
        ) : users.isError ? (
          <ErrorState onRetry={() => void users.refetch()} />
        ) : users.data.users.length === 0 ? (
          <p className="text-lg text-ink-soft">{filtered ? t.empty : t.noUsers}</p>
        ) : (
          <>
            {selectable.length > 0 && (
              <label className="mb-3 flex w-fit items-center gap-3 text-base font-medium text-ink">
                <input
                  type="checkbox"
                  checked={allMarked}
                  onChange={(event) =>
                    setSelectedIds(
                      event.target.checked ? new Set(selectable.map((user) => user.id)) : new Set(),
                    )
                  }
                  className="size-5 accent-forest"
                />
                {t.selectAll}
              </label>
            )}
            <ul className="grid gap-3">
              {users.data.users.map((user) => (
                <li key={user.id}>
                  <UserRow
                    user={user}
                    selected={user.id === me?.id ? null : selectedIds.has(user.id)}
                    onSelect={(marked) => mark(user.id, marked)}
                  />
                </li>
              ))}
            </ul>
            {users.data.total > users.data.users.length && (
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={users.isPlaceholderData}
                  onClick={() => setLimit((current) => current + USERS_PAGE_SIZE)}
                >
                  {t.showMore}
                </Button>
                <span className="text-sm text-ink-soft">
                  {t.shown(users.data.users.length, users.data.total)}
                </span>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}

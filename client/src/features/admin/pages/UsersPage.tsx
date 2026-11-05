import { useState } from 'react';
import type { Role } from '@/features/auth/api/authApi';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { formatDate } from '@/shared/lib/format';
import { useDebounced } from '@/shared/lib/useDebounced';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { text } from '@/text/sr-Latn';
import { USERS_PAGE_SIZE, useIssueActivation, useUsers } from '../api/queries';
import type { ManagedUser, UserStatus } from '../api/usersApi';
import { adminErrorMessage } from '../apiErrorMessage';
import { ActivationLink } from '../components/ActivationLink';

const t = text.admin.users;
const roles: readonly Role[] = ['teacher', 'student', 'parent', 'admin'];
const statuses: readonly UserStatus[] = ['active', 'deactivated', 'all'];

/** "Korisnici": the accounts of the school, with the filters an administrator needs most. */
export function UsersPage() {
  const [role, setRole] = useState<Role | ''>('');
  const [status, setStatus] = useState<UserStatus>('active');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(USERS_PAGE_SIZE);

  const query = useDebounced(search.trim());
  const users = useUsers({
    role: role || undefined,
    status,
    search: query || undefined,
    limit,
  });
  const filtered = Boolean(role || query || status !== 'active');

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
              setLimit(USERS_PAGE_SIZE);
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
              setLimit(USERS_PAGE_SIZE);
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
              setLimit(USERS_PAGE_SIZE);
            }}
            autoComplete="off"
            className="h-12 rounded-xl bg-card text-base md:text-base"
          />
        </div>
      </div>

      <section aria-label={t.resultsLabel} className="mt-6 max-w-4xl">
        {users.isPending ? (
          <LoadingState label={text.admin.load.loading} />
        ) : users.isError ? (
          <ErrorState onRetry={() => void users.refetch()} />
        ) : users.data.users.length === 0 ? (
          <p className="text-lg text-ink-soft">{filtered ? t.empty : t.noUsers}</p>
        ) : (
          <>
            <ul className="grid gap-3">
              {users.data.users.map((user) => (
                <li key={user.id}>
                  <UserRow user={user} />
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

/** Words, not only colours, tell the state apart. */
function Chip({ children, tone }: { children: string; tone: string }) {
  return <span className={`rounded-full px-3 py-1 text-sm font-medium ${tone}`}>{children}</span>;
}

function UserRow({ user }: { user: ManagedUser }) {
  const issue = useIssueActivation();
  const link = issue.data?.activation;
  // A person who left the school cannot sign in again until they are brought back.
  const canGetLink = !user.deactivatedAt;

  return (
    <div className="rounded-2xl bg-card px-5 py-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold break-words text-ink">{user.fullName}</p>
          <p className="text-sm text-ink-soft">{t.username(user.username)}</p>
          <p className="text-sm text-ink-soft">{user.email ?? t.noEmail}</p>
          <p className="text-sm text-ink-soft">{t.createdOn(formatDate(user.createdAt))}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="bg-lilac text-lilac-ink">{text.admin.roles[user.role]}</Chip>
          {user.deactivatedAt ? (
            <Chip tone="bg-blush text-blush-ink">{t.deactivated}</Chip>
          ) : (
            !user.activated && <Chip tone="bg-butter text-butter-ink">{t.notActivated}</Chip>
          )}
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

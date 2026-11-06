import { PlusIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link } from 'react-router';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { useDebounced } from '@/shared/lib/useDebounced';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { text } from '@/text/sr-Latn';
import { USERS_PAGE_SIZE, useUsers } from '../api/queries';
import { adminFamilyPath, adminNewUserWithRolePath } from '../paths';

const t = text.admin.families;

/** "Porodice": the children of the school; a child is opened to see and link their parents. */
export function FamiliesPage() {
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(USERS_PAGE_SIZE);
  const query = useDebounced(search.trim());
  const children = useUsers({
    role: 'student',
    status: 'active',
    search: query || undefined,
    limit,
  });

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">{t.heading}</h1>
        <Button asChild size="lg">
          <Link to={adminNewUserWithRolePath('student')}>
            <PlusIcon aria-hidden="true" weight="bold" className="size-5" />
            {t.newChild}
          </Link>
        </Button>
      </div>
      <p className="mt-2 max-w-2xl text-ink-soft">{t.intro}</p>

      <div className="mt-6 grid max-w-xl gap-2">
        <Label htmlFor="families-search" className="text-base">
          {t.searchLabel}
        </Label>
        <Input
          id="families-search"
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

      <section aria-label={t.resultsLabel} className="mt-6 max-w-3xl">
        {children.isPending ? (
          <LoadingState label={text.admin.load.loading} />
        ) : children.isError ? (
          <ErrorState onRetry={() => void children.refetch()} />
        ) : children.data.users.length === 0 ? (
          <p className="text-lg text-ink-soft">{query ? t.empty : t.noChildren}</p>
        ) : (
          <>
            <ul className="grid gap-3">
              {children.data.users.map((child) => (
                <li key={child.id}>
                  <Link
                    to={adminFamilyPath(child.id)}
                    aria-label={t.open(child.fullName)}
                    className="block rounded-2xl bg-card px-5 py-4 shadow-sm transition-shadow hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span className="block font-display text-lg font-semibold break-words text-ink">
                      {child.fullName}
                    </span>
                    <span className="block text-sm text-ink-soft">
                      {t.username(child.username)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {children.data.total > children.data.users.length && (
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={children.isPlaceholderData}
                  onClick={() => setLimit((value) => value + USERS_PAGE_SIZE)}
                >
                  {t.showMore}
                </Button>
                <span className="text-sm text-ink-soft">
                  {t.shown(children.data.users.length, children.data.total)}
                </span>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}

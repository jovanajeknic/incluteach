import { ArrowLeftIcon, PlusIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '@/shared/api/apiClient';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { MessagePage } from '@/shared/components/MessagePage';
import { useDebounced } from '@/shared/lib/useDebounced';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { text } from '@/text/sr-Latn';
import type { LinkedPerson } from '../api/familiesApi';
import { useLinkParent, useParentsOf, useUser, useUsers } from '../api/queries';
import type { ManagedUser } from '../api/usersApi';
import { adminErrorMessage } from '../apiErrorMessage';
import { adminFamiliesPath, adminNewUserWithRolePath } from '../paths';

const t = text.admin.families;

/** "Porodice" for one child: their parents and guardians, and linking one more. */
export function FamilyPage() {
  const { studentId = '' } = useParams();
  const child = useUser(studentId);

  if (child.isPending) return <LoadingState label={text.admin.load.loading} />;

  if (child.isError) {
    // A child of another school, a bad address and an account of another role look the same.
    if (child.error instanceof ApiError && child.error.status === 404) return <NotAChild />;
    return <ErrorState onRetry={() => void child.refetch()} />;
  }
  if (child.data.user.role !== 'student') return <NotAChild />;

  return <Family child={child.data.user} />;
}

function NotAChild() {
  return (
    <MessagePage
      title={t.notFoundTitle}
      description={t.notFoundDescription}
      action={
        <Button asChild variant="outline" size="lg">
          <Link to={adminFamiliesPath}>{t.back}</Link>
        </Button>
      }
    />
  );
}

function Family({ child }: { child: ManagedUser }) {
  const parents = useParentsOf(child.id);
  // What was done or why not; kept here because the row that was used changes at once.
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  return (
    <>
      <title>{text.app.pageTitle(child.fullName)}</title>
      <Link
        to={adminFamiliesPath}
        className="inline-flex items-center gap-2 font-medium text-forest underline-offset-4 hover:underline"
      >
        <ArrowLeftIcon aria-hidden="true" weight="bold" className="size-4" />
        {t.back}
      </Link>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight break-words text-ink">
        {child.fullName}
      </h1>
      <p className="mt-1 text-ink-soft">{t.username(child.username)}</p>
      {child.deactivatedAt && <p className="mt-1 font-medium text-butter-ink">{t.childLeft}</p>}

      <div role="status" aria-live="polite" className="mt-4 max-w-3xl empty:hidden">
        {notice && (
          <p className="rounded-2xl bg-mint px-4 py-3 font-medium text-mint-ink">{notice}</p>
        )}
      </div>
      {problem && (
        <p
          role="alert"
          className="mt-4 max-w-3xl rounded-2xl bg-blush px-4 py-3 font-medium text-blush-ink"
        >
          {problem}
        </p>
      )}

      <section aria-labelledby="parents-heading" className="mt-8 max-w-3xl">
        <h2 id="parents-heading" className="font-display text-2xl font-semibold text-ink">
          {t.parentsHeading}
        </h2>
        {parents.isPending ? (
          <LoadingState label={text.admin.load.loading} />
        ) : parents.isError ? (
          <ErrorState onRetry={() => void parents.refetch()} />
        ) : parents.data.links.length === 0 ? (
          <p className="mt-3 text-lg text-ink-soft">{t.noParents}</p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {parents.data.links.map(({ parent }) => (
              <li key={parent.id}>
                <ParentCard parent={parent} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {parents.data && (
        <LinkParent
          child={child}
          linkedIds={parents.data.links.map(({ parent }) => parent.id)}
          onLinked={(parentName) => {
            setProblem(null);
            setNotice(t.linked(parentName, child.fullName));
          }}
          onProblem={(message) => {
            setNotice(null);
            setProblem(message);
          }}
        />
      )}
    </>
  );
}

function ParentCard({ parent }: { parent: LinkedPerson }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card px-5 py-4 shadow-sm">
      <div className="min-w-0">
        <p className="font-display text-lg font-semibold break-words text-ink">
          {parent.deleted ? t.parentDeleted : parent.fullName}
        </p>
        {!parent.deleted && <p className="text-sm text-ink-soft">{t.username(parent.username)}</p>}
      </div>
      {parent.deactivated && !parent.deleted && (
        <span className="rounded-full bg-blush px-3 py-1 text-sm font-medium text-blush-ink">
          {t.parentLeft}
        </span>
      )}
    </div>
  );
}

interface LinkParentProps {
  child: ManagedUser;
  linkedIds: string[];
  onLinked: (parentName: string) => void;
  onProblem: (message: string) => void;
}

/** Find a parent account and link it to the child, after a question: a link cannot be undone. */
function LinkParent({ child, linkedIds, onLinked, onProblem }: LinkParentProps) {
  const [search, setSearch] = useState('');
  const [chosen, setChosen] = useState<ManagedUser | null>(null);
  const query = useDebounced(search.trim());
  const candidates = useUsers({
    role: 'parent',
    status: 'active',
    search: query || undefined,
    limit: 25,
  });
  const link = useLinkParent();
  // Someone already linked is not offered again.
  const offered = (candidates.data?.users ?? []).filter((person) => !linkedIds.includes(person.id));

  async function confirm(parent: ManagedUser) {
    setChosen(null);
    try {
      await link.mutateAsync({ parentId: parent.id, studentId: child.id });
      onLinked(parent.fullName);
    } catch (error) {
      onProblem(adminErrorMessage(error));
    }
  }

  return (
    <section aria-labelledby="link-heading" className="mt-10 max-w-3xl">
      <h2 id="link-heading" className="font-display text-2xl font-semibold text-ink">
        {t.addHeading}
      </h2>
      <p className="mt-1 max-w-2xl text-ink-soft">{t.addIntro}</p>
      <Button asChild variant="outline" size="lg" className="mt-4">
        <Link to={adminNewUserWithRolePath('parent')}>
          <PlusIcon aria-hidden="true" weight="bold" className="size-5" />
          {t.newParent}
        </Link>
      </Button>

      <div className="mt-6 grid max-w-xl gap-2">
        <Label htmlFor="parent-search" className="text-base">
          {t.parentSearchLabel}
        </Label>
        <Input
          id="parent-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          autoComplete="off"
          className="h-12 rounded-xl bg-card text-base md:text-base"
        />
      </div>

      <div aria-label={t.parentsResultsLabel} role="region" className="mt-4">
        {candidates.isPending ? (
          <LoadingState label={text.admin.load.loading} />
        ) : candidates.isError ? (
          <ErrorState onRetry={() => void candidates.refetch()} />
        ) : offered.length === 0 ? (
          <p className="text-ink-soft">{t.noParentAccounts}</p>
        ) : (
          <ul className="grid gap-3">
            {offered.map((person) => (
              <li
                key={person.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card px-5 py-4 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="font-display text-lg font-semibold break-words text-ink">
                    {person.fullName}
                  </p>
                  <p className="text-sm text-ink-soft">{t.username(person.username)}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  aria-label={t.linkFor(person.fullName)}
                  disabled={link.isPending}
                  onClick={() => setChosen(person)}
                >
                  {t.link}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={chosen !== null}
        onOpenChange={(open) => !open && setChosen(null)}
        title={chosen ? t.confirmTitle(chosen.fullName, child.fullName) : ''}
        description={t.confirm}
        confirmLabel={t.confirmYes}
        cancelLabel={t.cancel}
        onConfirm={() => chosen && void confirm(chosen)}
      />
    </section>
  );
}

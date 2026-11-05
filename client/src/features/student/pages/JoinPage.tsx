import { CheckCircleIcon, ClockIcon, XCircleIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { subjectAppearance } from '@/features/lessons/subjectAppearance';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { formatDate } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { useDebounced } from '@/shared/lib/useDebounced';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { SubjectBlob } from '@/shared/visual/SubjectBlob';
import { text } from '@/text/sr-Latn';
import { studentErrorMessage } from '../apiErrorMessage';
import {
  CATALOG_PAGE_SIZE,
  useCatalogClasses,
  useCatalogSubjects,
  useMyRequests,
  useRequestToJoin,
} from '../api/queries';
import type { CatalogSubject, Enrollment, RequestStatus } from '../api/studentApi';

const t = text.pupil.join;

/** Each state has its own word and icon, so colour is never the only difference. */
const statusLook: Record<RequestStatus, { icon: typeof ClockIcon; tone: string }> = {
  awaiting_parent: { icon: ClockIcon, tone: 'text-butter-ink' },
  awaiting_teacher: { icon: ClockIcon, tone: 'text-butter-ink' },
  approved: { icon: CheckCircleIcon, tone: 'text-mint-ink' },
  rejected: { icon: XCircleIcon, tone: 'text-blush-ink' },
};

function StatusChip({ status }: { status: RequestStatus }) {
  const { icon: StatusIcon, tone } = statusLook[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-display font-medium', tone)}>
      <StatusIcon aria-hidden="true" weight="fill" className="size-5" />
      {t.status[status]}
    </span>
  );
}

/** "Prijava na predmet": find a subject and ask to join it, and see the state of the requests. */
export function JoinPage() {
  const classes = useCatalogClasses();
  const requests = useMyRequests();
  const join = useRequestToJoin();
  const [classId, setClassId] = useState('');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(CATALOG_PAGE_SIZE);
  // Messages live here, not in a row: a row changes as soon as its request is sent.
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const query = useDebounced(search.trim());
  const subjects = useCatalogSubjects({
    classId: classId || undefined,
    search: query || undefined,
    limit,
  });

  function sendRequest(subjectId: string) {
    setNotice(null);
    setProblem(null);
    join.mutate(subjectId, {
      onSuccess: () => setNotice(t.sent),
      onError: (error) => setProblem(studentErrorMessage(error)),
    });
  }

  const pending = requests.data?.enrollments.filter((item) => item.status !== 'approved') ?? [];

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">{t.heading}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{t.intro}</p>

      <div role="status" aria-live="polite" className="mt-4 empty:hidden">
        {notice && (
          <p className="max-w-2xl rounded-2xl bg-mint px-4 py-3 font-medium text-mint-ink">
            {notice}
          </p>
        )}
      </div>
      {problem && (
        <p
          role="alert"
          className="mt-4 max-w-2xl rounded-2xl bg-blush px-4 py-3 font-medium text-blush-ink"
        >
          {problem}
        </p>
      )}

      <div className="mt-6 grid max-w-3xl gap-4 sm:grid-cols-[14rem_1fr]">
        <div className="grid gap-2">
          <Label htmlFor="join-class" className="text-base">
            {t.classLabel}
          </Label>
          <NativeSelect
            id="join-class"
            value={classId}
            onChange={(event) => {
              setClassId(event.target.value);
              setLimit(CATALOG_PAGE_SIZE);
            }}
            className="h-12 rounded-xl bg-card text-base"
          >
            <NativeSelectOption value="">{t.classAll}</NativeSelectOption>
            {classes.data?.classes.map((item) => (
              <NativeSelectOption key={item.id} value={item.id}>
                {item.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="join-search" className="text-base">
            {t.searchLabel}
          </Label>
          <Input
            id="join-search"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setLimit(CATALOG_PAGE_SIZE);
            }}
            autoComplete="off"
            className="h-12 rounded-xl bg-card text-base md:text-base"
          />
        </div>
      </div>

      <section aria-label={t.resultsLabel} className="mt-6 max-w-3xl">
        {subjects.isPending ? (
          <LoadingState label={text.pupil.load.loading} />
        ) : subjects.isError ? (
          <ErrorState onRetry={() => void subjects.refetch()} />
        ) : subjects.data.subjects.length === 0 ? (
          <p className="text-lg text-ink-soft">{classId || query ? t.empty : t.noSubjects}</p>
        ) : (
          <>
            <ul className="grid gap-3">
              {subjects.data.subjects.map((subject) => (
                <li key={subject.id}>
                  <SubjectRow
                    subject={subject}
                    sending={join.isPending && join.variables === subject.id}
                    busy={join.isPending}
                    onJoin={() => sendRequest(subject.id)}
                  />
                </li>
              ))}
            </ul>
            {subjects.data.total > subjects.data.subjects.length && (
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setLimit((current) => current + CATALOG_PAGE_SIZE)}
                >
                  {t.showMore}
                </Button>
                <span className="text-sm text-ink-soft">
                  {t.shown(subjects.data.subjects.length, subjects.data.total)}
                </span>
              </div>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="requests-heading" className="mt-12 max-w-3xl">
        <h2 id="requests-heading" className="font-display text-2xl font-semibold text-ink">
          {t.requestsHeading}
        </h2>
        {requests.isPending ? (
          <LoadingState label={text.pupil.load.loading} />
        ) : requests.isError ? (
          <ErrorState onRetry={() => void requests.refetch()} />
        ) : pending.length === 0 ? (
          <p className="mt-3 text-ink-soft">{t.requestsEmpty}</p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {pending.map((request) => (
              <li key={request.id}>
                <RequestRow request={request} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

interface SubjectRowProps {
  subject: CatalogSubject;
  sending: boolean;
  busy: boolean;
  onJoin: () => void;
}

function SubjectRow({ subject, sending, busy, onJoin }: SubjectRowProps) {
  const status = subject.request?.status;
  // A new request is possible when there is none, or after a rejection.
  const canJoin = !status || status === 'rejected';

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-card px-5 py-4 shadow-soft">
      <SubjectBlob subject={subjectAppearance(subject.id, subject.name)} />
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-semibold break-words text-ink">{subject.name}</p>
        <p className="text-sm text-ink-soft">
          {t.classOf(subject.className)} · {t.teacher(subject.teacher.fullName)}
        </p>
        {status && (
          <p className="mt-1 text-sm">
            <StatusChip status={status} />
            {status === 'rejected' && <span className="ml-2 text-ink-soft">{t.rejectedHint}</span>}
          </p>
        )}
      </div>
      {canJoin && (
        <Button
          type="button"
          size="lg"
          disabled={busy}
          aria-label={(status === 'rejected' ? t.joinAgainFor : t.joinFor)(
            subject.name,
            subject.className,
          )}
          onClick={onJoin}
        >
          {sending ? t.joining : status === 'rejected' ? t.joinAgain : t.join}
        </Button>
      )}
    </div>
  );
}

function RequestRow({ request }: { request: Enrollment }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-3xl bg-card px-5 py-4 shadow-soft">
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-semibold break-words text-ink">
          {request.subject.name}
        </p>
        <p className="text-sm text-ink-soft">
          {t.classOf(request.subject.className)} · {t.requestedOn(formatDate(request.createdAt))}
        </p>
      </div>
      <StatusChip status={request.status} />
    </div>
  );
}

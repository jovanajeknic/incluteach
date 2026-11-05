import { CheckIcon, XIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link } from 'react-router';
import { lessonErrorMessage } from '@/features/lessons/apiErrorMessage';
import { subjectLessonsPath } from '@/features/lessons/paths';
import { ApiError } from '@/shared/api/apiClient';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { formatDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { useApproveRequest, useRejectRequest, useWaitingRequests } from '../api/queries';
import type { Enrollment } from '../api/enrollmentsApi';

/** "Zahtjevi za predmete": students who want to join a subject, after a parent confirmed. */
export function RequestsPage() {
  const t = text.teacher.requests;
  const requests = useWaitingRequests();
  const approve = useApproveRequest();
  const reject = useRejectRequest();
  // Kept here, not in a card: a card disappears once its request is answered or refreshed away.
  const [problem, setProblem] = useState<string | null>(null);

  function answer(mutation: typeof approve | typeof reject, id: string) {
    setProblem(null);
    mutation.mutate(id, {
      onError: (error) =>
        // Someone else (the other parent, or a new teacher) got there first; the list refreshes.
        setProblem(
          error instanceof ApiError && error.code === 'wrong_state'
            ? t.alreadyAnswered
            : lessonErrorMessage(error),
        ),
    });
  }

  const busy = approve.isPending || reject.isPending;

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">{t.heading}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{t.intro}</p>

      <div role="alert" className="mt-4 max-w-3xl empty:hidden">
        {problem && (
          <p className="rounded-2xl bg-blush px-4 py-3 font-medium text-blush-ink">{problem}</p>
        )}
      </div>

      {requests.isPending ? (
        <LoadingState label={text.teacher.load.loading} />
      ) : requests.isError ? (
        <ErrorState onRetry={() => void requests.refetch()} />
      ) : requests.data.enrollments.length === 0 ? (
        <p className="mt-8 text-lg text-ink-soft">{t.empty}</p>
      ) : (
        <ul className="mt-6 grid max-w-3xl gap-4">
          {requests.data.enrollments.map((request) => (
            <li key={request.id}>
              <RequestCard
                request={request}
                busy={busy}
                approving={approve.isPending && approve.variables === request.id}
                rejecting={reject.isPending && reject.variables === request.id}
                onApprove={() => answer(approve, request.id)}
                onReject={() => answer(reject, request.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

interface RequestCardProps {
  request: Enrollment;
  /** Some answer is on its way; all buttons wait, so two clicks cannot cross. */
  busy: boolean;
  approving: boolean;
  rejecting: boolean;
  onApprove: () => void;
  onReject: () => void;
}

function RequestCard({
  request,
  busy,
  approving,
  rejecting,
  onApprove,
  onReject,
}: RequestCardProps) {
  const t = text.teacher.requests;
  const { student, subject } = request;

  return (
    <div className="rounded-3xl bg-card p-5 shadow-soft">
      <p className="font-display text-xl font-semibold break-words text-ink">{student.fullName}</p>
      <p className="mt-1 text-ink">
        {t.wants}{' '}
        <Link
          to={subjectLessonsPath(subject.id)}
          className="font-display font-semibold underline decoration-ochre decoration-2 underline-offset-4 hover:text-forest"
        >
          {subject.name} · {text.teacher.home.classHeading(subject.className)}
        </Link>
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        {request.requestedBy === 'student' ? t.askedByStudent : t.askedByParent} ·{' '}
        {formatDate(request.createdAt)}
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          type="button"
          size="lg"
          disabled={busy}
          aria-label={t.approveFor(student.fullName, subject.name)}
          onClick={onApprove}
        >
          <CheckIcon aria-hidden="true" weight="bold" />
          {approving ? t.answering : t.approve}
        </Button>
        <ConfirmDialog
          trigger={
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={busy}
              aria-label={t.rejectFor(student.fullName, subject.name)}
            >
              <XIcon aria-hidden="true" weight="bold" />
              {rejecting ? t.answering : t.reject}
            </Button>
          }
          title={t.rejectTitle}
          description={t.rejectText(student.fullName)}
          confirmLabel={t.rejectYes}
          cancelLabel={t.cancel}
          onConfirm={onReject}
        />
      </div>
    </div>
  );
}

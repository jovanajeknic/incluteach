import { CheckIcon, XIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link } from 'react-router';
import { lessonErrorMessage } from '@/features/lessons/apiErrorMessage';
import { ApiError } from '@/shared/api/apiClient';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { formatDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import {
  useApproveRequest,
  useRejectRequest,
  useWaitingRequests,
  type WaitingStatus,
} from '../api/queries';
import type { Enrollment } from '../api/enrollmentsApi';

/** The words of one inbox: the teacher answers requests as a teacher, a parent as a parent. */
export interface RequestsCopy {
  empty: string;
  wants: string;
  askedByStudent: string;
  askedByParent: string;
  approve: string;
  reject: string;
  answering: string;
  approveFor: (student: string, subject: string) => string;
  rejectFor: (student: string, subject: string) => string;
  rejectTitle: string;
  rejectText: (student: string) => string;
  rejectYes: string;
  cancel: string;
  alreadyAnswered: string;
}

interface RequestsInboxProps {
  /** Which requests this person answers: the teacher the ones the parent passed on. */
  status: WaitingStatus;
  copy: RequestsCopy;
  /** Where the name of the subject leads, if anywhere (a parent has no page for it). */
  subjectLink?: (request: Enrollment) => string;
}

/** Requests to join a subject that wait for this person, with the buttons to answer them. */
export function RequestsInbox({ status, copy, subjectLink }: RequestsInboxProps) {
  const requests = useWaitingRequests(status);
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
            ? copy.alreadyAnswered
            : lessonErrorMessage(error),
        ),
    });
  }

  const busy = approve.isPending || reject.isPending;

  return (
    <>
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
        <p className="mt-8 text-lg text-ink-soft">{copy.empty}</p>
      ) : (
        <ul className="mt-6 grid max-w-3xl gap-4">
          {requests.data.enrollments.map((request) => (
            <li key={request.id}>
              <RequestCard
                request={request}
                copy={copy}
                subjectLink={subjectLink?.(request)}
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
  copy: RequestsCopy;
  subjectLink?: string;
  /** Some answer is on its way; all buttons wait, so two clicks cannot cross. */
  busy: boolean;
  approving: boolean;
  rejecting: boolean;
  onApprove: () => void;
  onReject: () => void;
}

function RequestCard({
  request,
  copy,
  subjectLink,
  busy,
  approving,
  rejecting,
  onApprove,
  onReject,
}: RequestCardProps) {
  const { student, subject } = request;
  const subjectName = `${subject.name} · ${text.teacher.home.classHeading(subject.className)}`;
  const subjectClass =
    'font-display font-semibold underline decoration-ochre decoration-2 underline-offset-4 hover:text-forest';

  return (
    <div className="rounded-3xl bg-card p-5 shadow-soft">
      <p className="font-display text-xl font-semibold break-words text-ink">{student.fullName}</p>
      <p className="mt-1 text-ink">
        {copy.wants}{' '}
        {subjectLink ? (
          <Link to={subjectLink} className={subjectClass}>
            {subjectName}
          </Link>
        ) : (
          <span className="font-display font-semibold">{subjectName}</span>
        )}
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        {request.requestedBy === 'student' ? copy.askedByStudent : copy.askedByParent} ·{' '}
        {formatDate(request.createdAt)}
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          type="button"
          size="lg"
          disabled={busy}
          aria-label={copy.approveFor(student.fullName, subject.name)}
          onClick={onApprove}
        >
          <CheckIcon aria-hidden="true" weight="bold" />
          {approving ? copy.answering : copy.approve}
        </Button>
        <ConfirmDialog
          trigger={
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={busy}
              aria-label={copy.rejectFor(student.fullName, subject.name)}
            >
              <XIcon aria-hidden="true" weight="bold" />
              {rejecting ? copy.answering : copy.reject}
            </Button>
          }
          title={copy.rejectTitle}
          description={copy.rejectText(student.fullName)}
          confirmLabel={copy.rejectYes}
          cancelLabel={copy.cancel}
          onConfirm={onReject}
        />
      </div>
    </div>
  );
}

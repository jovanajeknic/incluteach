import { ArrowLeftIcon } from '@phosphor-icons/react';
import { Link, useParams } from 'react-router';
import { useMyRequests } from '@/features/student/api/queries';
import { SubjectOverview } from '@/features/student/components/SubjectOverview';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { MessagePage } from '@/shared/components/MessagePage';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { ChildGate } from '../components/ChildGate';
import { childPath } from '../paths';

const t = text.guardian.subject;

/** The lessons of one subject of one child, with the ones the child finished marked. */
export function ChildSubjectPage() {
  const { childId = '', subjectId = '' } = useParams();

  return (
    <ChildGate childId={childId}>
      {(child) => <Subject childId={child.id} name={child.fullName} subjectId={subjectId} />}
    </ChildGate>
  );
}

function Subject({
  childId,
  name,
  subjectId,
}: {
  childId: string;
  name: string;
  subjectId: string;
}) {
  const requests = useMyRequests(childId);

  if (requests.isPending) return <LoadingState label={text.pupil.load.loading} />;
  if (requests.isError) return <ErrorState onRetry={() => void requests.refetch()} />;

  const enrollment = requests.data.enrollments.find(
    (item) => item.status === 'approved' && item.subject.id === subjectId,
  );
  if (!enrollment) {
    return (
      <>
        <title>{text.app.pageTitle(t.notFoundTitle)}</title>
        <MessagePage
          title={t.notFoundTitle}
          description={t.notFoundDescription}
          action={
            <Button asChild variant="outline" size="lg">
              <Link to={childPath(childId)}>{t.back(name)}</Link>
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <title>{text.app.pageTitle(`${enrollment.subject.name} · ${name}`)}</title>
      <Link
        to={childPath(childId)}
        className="inline-flex items-center gap-1.5 rounded-full font-display font-medium text-ink-soft hover:text-forest"
      >
        <ArrowLeftIcon aria-hidden="true" weight="bold" className="size-4" />
        {t.back(name)}
      </Link>
      <SubjectOverview
        subject={enrollment.subject}
        studentId={childId}
        // The reading page of a lesson of a child comes with the next step.
        lessonPath={(lessonId) => `${childPath(childId)}/lessons/${encodeURIComponent(lessonId)}`}
      />
    </>
  );
}

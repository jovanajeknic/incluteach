import { ArrowLeftIcon } from '@phosphor-icons/react';
import { Link, useParams } from 'react-router';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { MessagePage } from '@/shared/components/MessagePage';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { useMyRequests } from '../api/queries';
import { SubjectOverview } from '../components/SubjectOverview';
import { studentHomePath, studentLessonPath } from '../paths';

const t = text.pupil.subject;

/** The lessons of one subject the student joined, with the ones already finished marked. */
export function SubjectPage() {
  const { subjectId = '' } = useParams();
  const requests = useMyRequests();

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
              <Link to={studentHomePath}>{t.back}</Link>
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <title>{text.app.pageTitle(enrollment.subject.name)}</title>
      <Link
        to={studentHomePath}
        className="inline-flex items-center gap-1.5 rounded-full font-display font-medium text-ink-soft hover:text-forest"
      >
        <ArrowLeftIcon aria-hidden="true" weight="bold" className="size-4" />
        {t.back}
      </Link>
      <SubjectOverview subject={enrollment.subject} lessonPath={studentLessonPath} />
    </>
  );
}

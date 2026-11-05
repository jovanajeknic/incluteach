import { ArrowLeftIcon } from '@phosphor-icons/react';
import { Link, useParams } from 'react-router';
import { ApiError } from '@/shared/api/apiClient';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { MessagePage } from '@/shared/components/MessagePage';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { useMySubjects } from '@/features/lessons/api/queries';
import { subjectStudentsPath } from '@/features/lessons/paths';
import { LessonProgressList } from '../components/LessonProgressList';
import { StarsSection } from '../components/StarsSection';
import { useStudentProgress } from '../api/queries';

/** One student in one subject: progress, the quiz tries of each lesson, and stars. */
export function StudentPage() {
  const t = text.teacher.students;
  const { subjectId = '', studentId = '' } = useParams();
  const progress = useStudentProgress(subjectId, studentId);
  const subjects = useMySubjects();

  if (progress.isPending || subjects.isPending) {
    return <LoadingState label={text.teacher.load.loading} />;
  }

  if (progress.isError) {
    const missing =
      progress.error instanceof ApiError &&
      (progress.error.status === 404 || progress.error.status === 403);
    if (!missing) return <ErrorState onRetry={() => void progress.refetch()} />;
    return (
      <>
        <title>{text.app.pageTitle(t.notFoundTitle)}</title>
        <MessagePage
          title={t.notFoundTitle}
          description={t.notFoundDescription}
          action={
            <Button asChild variant="outline" size="lg">
              <Link to={subjectStudentsPath(subjectId)}>{t.backToStudents}</Link>
            </Button>
          }
        />
      </>
    );
  }

  const { student, subject, lessons } = progress.data;
  const className = subjects.data?.subjects.find((item) => item.id === subjectId)?.className;
  const percent =
    lessons.published === 0 ? 0 : Math.round((lessons.completed / lessons.published) * 100);

  return (
    <>
      <title>{text.app.pageTitle(`${student.fullName} · ${subject.name}`)}</title>
      <Link
        to={subjectStudentsPath(subjectId)}
        className="inline-flex items-center gap-1.5 rounded-full font-display font-medium text-ink-soft hover:text-forest"
      >
        <ArrowLeftIcon aria-hidden="true" weight="bold" className="size-4" />
        {subject.name}
        {className && ` · ${text.teacher.home.classHeading(className)}`}
        {' · '}
        {t.backToStudents}
      </Link>

      <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight break-words text-ink">
        {student.fullName}
      </h1>

      <section aria-labelledby="progress-heading" className="mt-8">
        <h2 id="progress-heading" className="font-display text-2xl font-semibold text-ink">
          {t.progressHeading}
        </h2>
        <p className="mt-2 text-lg text-ink">
          {t.progressOf(lessons.completed, lessons.published)}
        </p>
        <div
          role="progressbar"
          aria-label={t.progressLabel(student.fullName)}
          aria-valuemin={0}
          aria-valuemax={Math.max(lessons.published, 1)}
          aria-valuenow={lessons.completed}
          aria-valuetext={t.progressOf(lessons.completed, lessons.published)}
          className="mt-3 h-3 max-w-xl overflow-hidden rounded-full bg-mint"
        >
          <div className="h-full rounded-full bg-forest" style={{ width: `${percent}%` }} />
        </div>
      </section>

      <section aria-labelledby="lessons-heading" className="mt-10">
        <h2 id="lessons-heading" className="mb-4 font-display text-2xl font-semibold text-ink">
          {t.lessonsHeading}
        </h2>
        <LessonProgressList items={progress.data.items} studentId={studentId} />
      </section>

      <StarsSection subjectId={subjectId} studentId={studentId} />
    </>
  );
}

import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router';
import { LessonContent } from '@/features/lesson-content/LessonContent';
import { MessagePage } from '@/shared/components/MessagePage';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { LessonStatusBadge } from '../components/LessonStatusBadge';
import { useLessons } from '../data/lessonsContext';
import { teacherHomePath } from '../paths';
import type { LessonDetailLocationState } from './NewLessonPage';

function BackToLessonsLink() {
  return (
    <Link
      to={teacherHomePath}
      className="inline-flex items-center gap-2 rounded-md font-medium text-primary underline-offset-4 hover:underline"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {text.lessonDetail.backToLessons}
    </Link>
  );
}

export function LessonDetailPage() {
  const t = text.lessonDetail;
  const { lessonId = '' } = useParams();
  const location = useLocation();
  const { getLessonById } = useLessons();
  const lesson = getLessonById(lessonId);
  const justCreated = (location.state as LessonDetailLocationState | null)?.justCreated === true;

  if (!lesson) {
    return (
      <>
        <title>{text.app.pageTitle(t.notFoundTitle)}</title>
        <MessagePage
          title={t.notFoundTitle}
          description={t.notFoundDescription}
          action={
            <Button asChild variant="outline" size="lg">
              <Link to={teacherHomePath}>{t.backToLessons}</Link>
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <title>{text.app.pageTitle(lesson.title)}</title>
      <div className="mb-6">
        <BackToLessonsLink />
      </div>

      {justCreated && (
        <p
          role="status"
          className="mb-6 flex items-center gap-2 rounded-lg border border-[#b9ddd4] bg-[#e1f2ed] px-4 py-3 font-medium text-[#0d5b53]"
        >
          <CheckCircle2 aria-hidden="true" className="size-5 shrink-0" />
          {t.savedMessage}
        </p>
      )}

      <article className="rounded-xl border bg-card p-5 shadow-sm sm:p-8">
        <header className="mb-8 border-b pb-6">
          <h1 className="text-2xl font-semibold tracking-tight break-words sm:text-3xl">
            {lesson.title}
          </h1>
          <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-4">
            <div>
              <dt className="text-sm text-muted-foreground">{text.lesson.subject}</dt>
              <dd className="font-medium">{lesson.subject}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{text.lesson.grade}</dt>
              <dd className="font-medium">{text.lesson.gradeLabel(lesson.grade)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{text.lesson.status}</dt>
              <dd className="mt-1">
                <LessonStatusBadge status={lesson.status} />
              </dd>
            </div>
          </dl>
        </header>

        <section aria-labelledby="lesson-content-heading">
          <h2 id="lesson-content-heading" className="sr-only">
            {text.lesson.content}
          </h2>
          <LessonContent content={lesson.content} />
        </section>
      </article>
    </>
  );
}

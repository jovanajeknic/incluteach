import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router';
import { useSchool } from '@/features/school/schoolContext';
import { MessagePage } from '@/shared/components/MessagePage';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { LessonStatusBadge } from '../components/LessonStatusBadge';
import { teacherHomePath } from '../paths';
import { AdaptationPanel } from '../workflow/AdaptationPanel';
import { ApprovalPanel } from '../workflow/ApprovalPanel';
import { AssignPanel } from '../workflow/AssignPanel';
import { GlossaryEditor } from '../workflow/GlossaryEditor';
import { HomeGuidanceEditor } from '../workflow/HomeGuidanceEditor';
import { QuizEditor } from '../workflow/QuizEditor';
import { SectionCard } from '../workflow/SectionCard';
import { VersionCard } from '../workflow/VersionCard';
import { WorkflowSteps } from '../workflow/WorkflowSteps';
import type { LessonDetailLocationState } from './NewLessonPage';

function BackToLessonsLink() {
  return (
    <Link
      to={teacherHomePath}
      className="inline-flex items-center gap-2 rounded-full font-display font-medium text-forest hover:underline"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {text.lessonDetail.backToLessons}
    </Link>
  );
}

/**
 * The whole lesson workflow on one page: AI adaptation, review and editing of every part,
 * approval, and assignment to students.
 */
export function LessonDetailPage() {
  const t = text.lessonDetail;
  const { lessonId = '' } = useParams();
  const location = useLocation();
  const { getLesson, subjects } = useSchool();
  const lesson = getLesson(lessonId);
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

  const subject = subjects.find((item) => item.id === lesson.subjectId);
  const aiRun = lesson.adaptationCount ?? 0;
  // Teacher's text first, then the adapted versions.
  const versions = [...lesson.versions].sort((a, b) =>
    a.kind === 'standard' ? -1 : b.kind === 'standard' ? 1 : 0,
  );

  return (
    <>
      <title>{text.app.pageTitle(lesson.title)}</title>
      <div className="mb-6">
        <BackToLessonsLink />
      </div>

      {justCreated && (
        <p
          role="status"
          className="mb-6 flex items-center gap-2 rounded-2xl bg-mint px-4 py-3 font-medium text-mint-ink"
        >
          <CheckCircle2 aria-hidden="true" className="size-5 shrink-0" />
          {t.savedMessage}
        </p>
      )}

      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight break-words text-ink">
          {lesson.title}
        </h1>
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <dt className="text-sm text-ink-soft">{text.lesson.subject}</dt>
            <dd className="font-medium">{subject?.name}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-soft">{text.lesson.grade}</dt>
            <dd className="font-medium">{text.lesson.gradeLabel(lesson.grade)}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-soft">{text.lesson.status}</dt>
            <dd className="mt-1">
              <LessonStatusBadge status={lesson.status} />
            </dd>
          </div>
        </dl>
      </header>

      <div className="mb-8">
        <WorkflowSteps status={lesson.status} />
      </div>

      <div className="grid gap-6">
        <AdaptationPanel lesson={lesson} />

        <SectionCard id="versions-heading" title={t.versions.heading}>
          <div className="grid gap-4 lg:grid-cols-2">
            {versions.map((version) => (
              // Keyed by content so the card resets when the AI replaces this version.
              <VersionCard
                key={`${version.kind}-${version.content.length}`}
                lesson={lesson}
                version={version}
              />
            ))}
          </div>
        </SectionCard>

        {/* Editors keep local drafts and reload them only when a new AI result arrives. */}
        <GlossaryEditor key={`glossary-${aiRun}`} lesson={lesson} />
        <QuizEditor key={`quiz-${aiRun}`} lesson={lesson} />
        <HomeGuidanceEditor key={`home-${aiRun}`} lesson={lesson} />
        <ApprovalPanel lesson={lesson} />
        <AssignPanel lesson={lesson} />
      </div>
    </>
  );
}

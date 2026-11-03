import { ArrowLeft } from 'lucide-react';
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
      className="inline-flex items-center gap-1.5 rounded-full text-ink-soft hover:text-forest"
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
      <BackToLessonsLink />

      {justCreated && (
        <p role="status" className="hand-note mt-4 text-xl text-mint-ink">
          ✓ {t.savedMessage}
        </p>
      )}

      <header className="mt-4 mb-10">
        <h1 className="font-display text-3xl font-bold tracking-tight break-words text-ink sm:text-4xl">
          {lesson.title}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-soft">
          <span>{subject?.name}</span>
          <span aria-hidden="true">·</span>
          <span>{text.lesson.gradeLabel(lesson.grade)}</span>
          <span aria-hidden="true">·</span>
          <LessonStatusBadge status={lesson.status} />
        </p>
      </header>

      {/* A worksheet on the left, the to-do list and final steps in the margin on the right. */}
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-14">
        <div className="grid gap-12">
          <AdaptationPanel lesson={lesson} />

          <SectionCard id="versions-heading" title={t.versions.heading}>
            <div className="grid gap-8 xl:grid-cols-2">
              {versions.map((version) => (
                // Keyed by content so the sheet resets when the AI replaces this version.
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
        </div>

        <aside className="grid content-start gap-8 lg:sticky lg:top-6 lg:self-start">
          <WorkflowSteps status={lesson.status} />
          <ApprovalPanel lesson={lesson} />
          <AssignPanel lesson={lesson} />
        </aside>
      </div>
    </>
  );
}

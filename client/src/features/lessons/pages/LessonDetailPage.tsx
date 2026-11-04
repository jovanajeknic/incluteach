import {
  ArrowClockwiseIcon,
  ArrowLeftIcon,
  ArrowUUpLeftIcon,
  CheckCircleIcon,
  ListChecksIcon,
  SparkleIcon,
  TrashIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { Tabs } from 'radix-ui';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { findVersion, isVersionApproved, useSchool } from '@/features/school/schoolContext';
import { ADAPTED_KINDS, type AdaptedKind, type SchoolLesson } from '@/features/school/types';
import { AiPulse } from '@/shared/visual/AiPulse';
import { SubjectBlob } from '@/shared/visual/SubjectBlob';
import { blobShape } from '@/shared/visual/subjectIcons';
import { MessagePage } from '@/shared/components/MessagePage';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { LessonStatusBadge } from '../components/LessonStatusBadge';
import { coursePath, teacherHomePath } from '../paths';
import { AiWorkingPanel } from '../workflow/AiWorkingPanel';
import { GlossaryEditor } from '../workflow/GlossaryEditor';
import { HomeGuidanceEditor } from '../workflow/HomeGuidanceEditor';
import { PublishBar } from '../workflow/PublishBar';
import { QuizEditor } from '../workflow/QuizEditor';
import { versionAppearance } from '../workflow/versionKinds';
import { TextVersionEditor, VersionPanel } from '../workflow/VersionPanel';

type Tab = 'standard' | AdaptedKind | 'extras';

/**
 * One lesson: the AI at work, then every version on its own tab with the teacher's
 * feedback and approval, and finally publishing to the class.
 */
export function LessonDetailPage() {
  const t = text.lessonDetail;
  const { lessonId = '' } = useParams();
  const school = useSchool();
  const lesson = school.getLesson(lessonId);

  if (!lesson) {
    return (
      <>
        <title>{text.app.pageTitle(t.notFoundTitle)}</title>
        <MessagePage
          title={t.notFoundTitle}
          description={t.notFoundDescription}
          action={
            <Button asChild variant="outline" size="lg">
              <Link to={teacherHomePath}>{t.backToSubjects}</Link>
            </Button>
          }
        />
      </>
    );
  }

  // Screens follow the same rule as the backend must: only the teacher of this subject in
  // this class works on the lesson.
  if (!school.teachesCourse(lesson.subjectId, lesson.classId)) {
    return (
      <>
        <title>{text.app.pageTitle(t.forbiddenTitle)}</title>
        <MessagePage
          title={t.forbiddenTitle}
          description={t.forbiddenDescription}
          action={
            <Button asChild variant="outline" size="lg">
              <Link to={teacherHomePath}>{t.backToSubjects}</Link>
            </Button>
          }
        />
      </>
    );
  }

  const subject = school.getSubject(lesson.subjectId);
  const group = school.getClass(lesson.classId);
  const courseLabel = text.lesson.courseLabel(subject?.name ?? '', group?.name ?? '');

  return (
    <>
      <title>{text.app.pageTitle(lesson.title)}</title>
      <Link
        to={coursePath(lesson.subjectId, lesson.classId)}
        className="inline-flex items-center gap-1.5 rounded-full font-display font-medium text-ink-soft hover:text-forest"
      >
        <ArrowLeftIcon aria-hidden="true" weight="bold" className="size-4" />
        {courseLabel}
      </Link>

      <header className="mt-5 mb-8 flex flex-wrap items-center gap-4">
        {subject && <SubjectBlob subject={subject} size="lg" />}
        <div className="min-w-0">
          <h1 className="font-display text-4xl font-semibold tracking-tight break-words text-ink">
            {lesson.title}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-soft">
            <span>{courseLabel}</span>
            <LessonStatusBadge status={lesson.status} />
          </p>
        </div>
        <div className="ml-auto">
          <LessonManageAction lesson={lesson} />
        </div>
      </header>

      {lesson.aiFailed === 'all' && lesson.status !== 'processing' && (
        <div
          role="alert"
          className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-blush px-5 py-4 text-blush-ink"
        >
          <p className="flex items-center gap-2 font-medium">
            <WarningIcon aria-hidden="true" weight="fill" className="size-5 shrink-0" />
            {t.ai.failed}
          </p>
          <Button
            type="button"
            onClick={() => void school.generateAll(lesson.id)}
            className="h-11 px-5"
          >
            <ArrowClockwiseIcon aria-hidden="true" weight="bold" />
            {t.ai.retry}
          </Button>
        </div>
      )}

      {lesson.status === 'processing' ? (
        <AiWorkingPanel />
      ) : lesson.status === 'draft' ? (
        <DraftPanel lesson={lesson} />
      ) : (
        // Keyed by AI run so the tab and editors start fresh when a new result arrives.
        <LessonTabs key={lesson.adaptationCount ?? 0} lesson={lesson} />
      )}
    </>
  );
}

function DraftPanel({ lesson }: { lesson: SchoolLesson }) {
  const t = text.lessonDetail;
  const { generateAll } = useSchool();
  const standard = findVersion(lesson, 'standard');
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="rounded-[1.75rem] bg-card p-6 shadow-soft sm:p-8">
        {standard && <TextVersionEditor lesson={lesson} version={standard} />}
      </div>
      <aside className="flex flex-col items-start gap-4 rounded-3xl bg-lilac p-6">
        <AiPulse size="md" />
        <h2 className="font-display text-xl font-semibold text-ink">{t.ai.draftTitle}</h2>
        <p className="text-ink-soft">{t.ai.draftText}</p>
        <Button
          type="button"
          onClick={() => void generateAll(lesson.id)}
          className="h-12 px-6 text-base"
        >
          <SparkleIcon aria-hidden="true" weight="fill" />
          {t.ai.start}
        </Button>
      </aside>
    </div>
  );
}

/** Opens on the first version that still waits for the teacher. */
function firstOpenTab(lesson: SchoolLesson): Tab {
  const waiting = ADAPTED_KINDS.find((kind) => !isVersionApproved(lesson, kind));
  if (waiting) return waiting;
  return lesson.extrasApproved ? 'standard' : 'extras';
}

function LessonTabs({ lesson }: { lesson: SchoolLesson }) {
  const t = text.lessonDetail;
  const [tab, setTab] = useState<Tab>(() => firstOpenTab(lesson));
  const tabs: Tab[] = ['standard', ...ADAPTED_KINDS, 'extras'];
  const aiRun = lesson.adaptationCount ?? 0;

  return (
    <>
      <Tabs.Root value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <Tabs.List
          aria-label={t.tabsLabel}
          className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-wrap md:px-0"
        >
          {tabs.map((value) => (
            <TabButton key={value} lesson={lesson} value={value} active={tab === value} />
          ))}
        </Tabs.List>

        <Tabs.Content value="standard" className="mt-6 focus-visible:outline-none">
          <OriginalPanel lesson={lesson} />
        </Tabs.Content>
        {ADAPTED_KINDS.map((kind) => (
          <Tabs.Content key={kind} value={kind} className="mt-6 focus-visible:outline-none">
            <VersionPanel lesson={lesson} kind={kind} />
          </Tabs.Content>
        ))}
        <Tabs.Content value="extras" className="mt-6 grid gap-12 focus-visible:outline-none">
          <ExtrasApproval lesson={lesson} />
          {/* Editors keep local drafts and reload them only when a new AI result arrives. */}
          <QuizEditor key={`quiz-${aiRun}`} lesson={lesson} />
          <GlossaryEditor key={`glossary-${aiRun}`} lesson={lesson} />
          <HomeGuidanceEditor key={`home-${aiRun}`} lesson={lesson} />
        </Tabs.Content>
      </Tabs.Root>

      <PublishBar lesson={lesson} />
    </>
  );
}

function TabButton({
  lesson,
  value,
  active,
}: {
  lesson: SchoolLesson;
  value: Tab;
  active: boolean;
}) {
  const t = text.lessonDetail;
  const isExtras = value === 'extras';
  const kindAppearance = isExtras ? undefined : versionAppearance[value];
  const TabIcon = kindAppearance?.icon ?? ListChecksIcon;
  const tone = kindAppearance?.tone ?? 'bg-mint text-mint-ink';
  const isAiKind = !isExtras && value !== 'standard';
  // Quiz and words are approved as one, like a version.
  const needsApproval = isAiKind || isExtras;
  const approved = isExtras
    ? lesson.extrasApproved === true
    : isAiKind && isVersionApproved(lesson, value);
  const redoing = isAiKind && (lesson.regenerating?.includes(value) ?? false);
  const label = isExtras ? t.extrasTab : t.kinds[value];

  return (
    <Tabs.Trigger
      value={value}
      className={cn(
        'relative flex shrink-0 items-center gap-2 rounded-2xl py-2 pr-4 pl-2 font-display font-medium transition-colors',
        active ? 'text-ink' : 'text-ink-soft hover:bg-card/70 hover:text-ink',
      )}
    >
      {active && (
        <motion.span
          layoutId="lesson-tab-marker"
          aria-hidden="true"
          className="absolute inset-0 rounded-2xl bg-card shadow-soft"
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        />
      )}
      <span
        aria-hidden="true"
        className={cn('relative flex size-8 items-center justify-center', blobShape, tone)}
      >
        <TabIcon weight="duotone" className="size-4.5" />
      </span>
      <span className="relative">{label}</span>
      {redoing ? (
        <AiPulse size="sm" className="relative size-5" />
      ) : (
        needsApproval && (
          <span className="relative">
            {approved ? (
              <CheckCircleIcon aria-hidden="true" weight="fill" className="size-5 text-mint-ink" />
            ) : (
              <span aria-hidden="true" className="block size-2.5 rounded-full bg-butter-deep" />
            )}
            <span className="sr-only">{approved ? `, ${t.approved}` : `, ${t.aiSuggestion}`}</span>
          </span>
        )
      )}
    </Tabs.Trigger>
  );
}

/**
 * Takes a published lesson back from students, or deletes one that was never published.
 * Both ask once more, because students or the teacher's work would be affected.
 */
function LessonManageAction({ lesson }: { lesson: SchoolLesson }) {
  const t = text.lessonDetail.manage;
  const school = useSchool();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [withdrawn, setWithdrawn] = useState(false);
  const published = lesson.status === 'assigned';
  if (lesson.status === 'processing') return null;

  if (confirming) {
    return (
      <div
        role="group"
        aria-label={published ? t.unpublish : t.delete}
        className="flex max-w-sm flex-col gap-3 rounded-3xl bg-blush p-4 text-ink"
      >
        <p>{published ? t.unpublishConfirm : t.deleteConfirm}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              if (published) {
                school.unpublishLesson(lesson.id);
                setWithdrawn(true);
                setConfirming(false);
              } else {
                school.deleteLesson(lesson.id);
                navigate(coursePath(lesson.subjectId, lesson.classId));
              }
            }}
            className="h-10 px-4"
          >
            {published ? t.unpublishYes : t.deleteYes}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirming(false)}
            className="h-10 px-4"
          >
            {t.cancel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div role="status" className="flex flex-col items-end gap-2">
      {withdrawn && !published && <p className="text-sm text-mint-ink">{t.unpublished}</p>}
      <Button
        type="button"
        variant="ghost"
        onClick={() => setConfirming(true)}
        className="h-10 px-3 text-blush-ink hover:bg-blush"
      >
        {published ? (
          <ArrowUUpLeftIcon aria-hidden="true" weight="bold" />
        ) : (
          <TrashIcon aria-hidden="true" weight="duotone" />
        )}
        {published ? t.unpublish : t.delete}
      </Button>
    </div>
  );
}

/** The quiz questions and word explanations come from the AI too, so they need a yes. */
function ExtrasApproval({ lesson }: { lesson: SchoolLesson }) {
  const t = text.lessonDetail;
  const { approveExtras } = useSchool();

  if (lesson.extrasApproved) {
    return (
      <p className="flex w-fit items-center gap-2 rounded-3xl bg-mint px-5 py-3 font-display font-semibold text-mint-ink">
        <CheckCircleIcon aria-hidden="true" weight="duotone" className="size-6" />
        {t.approved}
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-butter px-5 py-4">
      <p className="flex items-center gap-2 text-ink">
        <SparkleIcon
          aria-hidden="true"
          weight="duotone"
          className="size-5 shrink-0 text-butter-ink"
        />
        {t.extrasHint}
      </p>
      <Button type="button" onClick={() => approveExtras(lesson.id)} className="h-11 px-5">
        <CheckCircleIcon aria-hidden="true" weight="bold" />
        {t.approveExtras}
      </Button>
    </div>
  );
}

function OriginalPanel({ lesson }: { lesson: SchoolLesson }) {
  const t = text.lessonDetail;
  const school = useSchool();
  const standard = findVersion(lesson, 'standard');
  const suggestions = school.suggestionsForAdaptation(lesson);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="rounded-[1.75rem] bg-card p-6 shadow-soft sm:p-8">
        <p className="mb-6 text-ink-soft">{t.kindHints.standard}</p>
        {standard && <TextVersionEditor lesson={lesson} version={standard} />}
      </div>
      <aside className="grid content-start gap-6">
        <section aria-labelledby="ai-again-heading" className="rounded-3xl bg-lilac/60 p-5">
          <h2 id="ai-again-heading" className="sr-only">
            {t.ai.again}
          </h2>
          <p className="text-sm text-ink-soft">{t.ai.againHint}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void school.generateAll(lesson.id)}
            className="mt-3 h-11 w-full border-lilac-ink/40 bg-card text-lilac-ink hover:border-lilac-ink hover:bg-card"
          >
            <ArrowClockwiseIcon aria-hidden="true" weight="bold" />
            {t.ai.again}
          </Button>
        </section>
        {suggestions.length > 0 && (
          <section aria-labelledby="parent-notes-heading" className="rounded-3xl bg-blush/70 p-5">
            <h2 id="parent-notes-heading" className="font-display font-semibold text-ink">
              {t.ai.suggestionsIntro}
            </h2>
            <ul className="mt-2 grid gap-2 text-sm text-ink">
              {suggestions.flatMap((item) =>
                item.aiNote ? [<li key={item.id}>„{item.aiNote}“</li>] : [],
              )}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}

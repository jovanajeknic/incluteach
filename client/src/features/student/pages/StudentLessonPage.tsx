import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  FootprintsIcon,
  InfoIcon,
  PuzzlePieceIcon,
  StarIcon,
  TextAaIcon,
} from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { LessonContent } from '@/features/lesson-content/LessonContent';
import { lessonSentences, splitParagraphs } from '@/features/lesson-content/sentences';
import {
  backgroundClass,
  readingTextClassName,
} from '@/features/reading-preferences/readingPreferences';
import { ReadingPreferencesPanel } from '@/features/reading-preferences/ReadingPreferencesPanel';
import { useReadingPreferences } from '@/features/reading-preferences/useReadingPreferences';
import { MessagePage } from '@/shared/components/MessagePage';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { blobShape } from '@/shared/visual/subjectIcons';
import { SubjectBlob } from '@/shared/visual/SubjectBlob';
import { text } from '@/text/sr-Latn';
import { ListenControls } from '../audio/ListenControls';
import { useLessonSpeech } from '../audio/useLessonSpeech';
import { useStudent } from '../data/studentContext';
import { approvedVersion, pickAudioVersion, pickLessonVersion } from '../lessonVersion';
import { studentHomePath, studentQuizPath, subjectPath } from '../paths';
import type { StudentLesson, StudentProfile, Subject } from '../types';

const SETTINGS_PANEL_ID = 'reading-settings';

export function StudentLessonPage() {
  const { lessonId = '' } = useParams();
  const { profile, getLesson, getSubject } = useStudent();
  const lesson = getLesson(lessonId);
  const subject = lesson ? getSubject(lesson.subjectId) : undefined;

  if (!lesson || !subject) {
    const t = text.student.lesson;
    return (
      <>
        <title>{text.app.pageTitle(t.notFoundTitle)}</title>
        <MessagePage
          title={t.notFoundTitle}
          description={t.notFoundDescription}
          action={
            <Button asChild variant="outline" size="lg">
              <Link to={studentHomePath}>{text.student.subject.backToSubjects}</Link>
            </Button>
          }
        />
      </>
    );
  }

  // Keyed by lesson so steps, audio and panel state start fresh for each lesson.
  return <LessonView key={lesson.id} lesson={lesson} subject={subject} profile={profile} />;
}

interface LessonViewProps {
  lesson: StudentLesson;
  subject: Subject;
  profile: StudentProfile;
}

function LessonView({ lesson, subject, profile }: LessonViewProps) {
  const t = text.student.lesson;
  const { markStarted, markLessonDone, starsFor } = useStudent();
  const earned = starsFor(lesson.id);
  const support = profile.supportProfile;
  // Only teacher-approved versions can be picked; the page is reached only if one exists.
  const version = pickLessonVersion(lesson, support)!;
  const audio = pickAudioVersion(lesson, support);
  const illustrations = approvedVersion(lesson, 'illustrations')?.illustrations ?? [];

  // Students meant to get the dyslexia-friendly text start with the matching font and
  // spacing, even while that version is not ready and they read the teacher's text.
  const { preferences, update, reset } = useReadingPreferences(
    profile.id,
    support.readingVersion === 'dyslexia' ? 'easier-reading' : 'standard',
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [stepByStep, setStepByStep] = useState(false);
  const [step, setStep] = useState(0);

  const paragraphs = useMemo(() => splitParagraphs(version.content), [version.content]);
  const shownContent = stepByStep ? (paragraphs[step] ?? '') : version.content;
  // Students who receive audio hear the narrated script; others hear the text on screen.
  const spokenContent = audio?.content ?? shownContent;
  const sentences = useMemo(() => lessonSentences(spokenContent), [spokenContent]);
  const speech = useLessonSpeech(sentences);

  useEffect(() => {
    markStarted(lesson.id);
  }, [lesson.id, markStarted]);

  return (
    <>
      <title>{text.app.pageTitle(lesson.title)}</title>
      <Link
        to={subjectPath(subject.id)}
        className="inline-flex items-center gap-1.5 rounded-full font-display font-medium text-ink-soft hover:text-forest"
      >
        <ArrowLeftIcon aria-hidden="true" weight="bold" className="size-4" />
        {t.backToSubject(subject.name)}
      </Link>

      <header className="mt-5 mb-6 flex flex-wrap items-center gap-4">
        <SubjectBlob subject={subject} size="lg" />
        <h1 className="font-display text-4xl font-semibold tracking-tight break-words text-ink">
          {lesson.title}
        </h1>
      </header>

      {/* Tools that change how the lesson is read or heard. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.75rem] bg-card/70 p-2 shadow-soft">
        <div className="flex flex-wrap gap-1">
          <ToolButton
            icon={TextAaIcon}
            tone="bg-butter text-butter-ink"
            active={settingsOpen}
            aria-expanded={settingsOpen}
            aria-controls={SETTINGS_PANEL_ID}
            onClick={() => setSettingsOpen((open) => !open)}
          >
            {t.readingSettings}
          </ToolButton>
          <ToolButton
            icon={FootprintsIcon}
            tone="bg-mint text-mint-ink"
            active={stepByStep}
            aria-pressed={stepByStep}
            onClick={() => {
              setStepByStep((current) => !current);
              setStep(0);
            }}
          >
            {t.stepByStep}
          </ToolButton>
        </div>
        <ListenControls
          availability={speech.availability}
          status={speech.status}
          rate={speech.rate}
          onRateChange={speech.setRate}
          onPlay={speech.play}
          onPause={speech.pause}
          onResume={speech.resume}
          onStop={speech.stop}
        />
      </div>

      {settingsOpen && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
          <ReadingPreferencesPanel
            id={SETTINGS_PANEL_ID}
            preferences={preferences}
            onChange={update}
            onReset={reset}
            className="rounded-[1.75rem] border-0 bg-butter"
          />
        </motion.div>
      )}

      <article
        aria-label={lesson.title}
        className={cn(
          'mt-4 rounded-[2rem] px-6 py-8 shadow-soft sm:px-12 sm:py-12',
          backgroundClass[preferences.background],
        )}
      >
        {stepByStep && (
          <p
            className="mb-5 flex items-center gap-3 font-display font-medium text-mint-ink"
            aria-live="polite"
          >
            {t.stepProgress(step + 1, paragraphs.length)}
            <span aria-hidden="true" className="flex gap-1.5">
              {paragraphs.map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    'size-2.5 rounded-full transition-colors',
                    index <= step ? 'bg-mint-ink' : 'bg-mint',
                  )}
                />
              ))}
            </span>
          </p>
        )}

        <LessonContent
          content={shownContent}
          glossary={lesson.glossary}
          // The narrated script differs from the text, so there is no sentence to follow.
          activeSentence={audio ? null : speech.activeSentence}
          className={cn('text-ink', readingTextClassName(preferences))}
        />

        {stepByStep && (
          <div className="mt-8 flex flex-wrap justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={step === 0}
              onClick={() => setStep((current) => current - 1)}
              className="h-11 px-4"
            >
              <ArrowLeftIcon aria-hidden="true" weight="bold" />
              {t.previousStep}
            </Button>
            <Button
              type="button"
              disabled={step >= paragraphs.length - 1}
              onClick={() => setStep((current) => current + 1)}
              className="h-11 px-4"
            >
              {t.nextStep}
              <ArrowRightIcon aria-hidden="true" weight="bold" />
            </Button>
          </div>
        )}

        {illustrations.length > 0 && (
          <section aria-label={t.picturesLabel} className="mt-10 grid gap-6 sm:grid-cols-2">
            {illustrations.map((item, index) => (
              <motion.figure
                key={item.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  className="w-full rounded-3xl border border-border bg-card"
                />
                <figcaption className="mt-2 text-ink-soft">{item.caption}</figcaption>
              </motion.figure>
            ))}
          </section>
        )}

        {lesson.glossary.length > 0 && (
          <p className="mt-8 flex items-center gap-2 text-sm text-blush-ink">
            <InfoIcon aria-hidden="true" weight="duotone" className="size-5 shrink-0" />
            {t.glossaryHint}
          </p>
        )}
      </article>

      <section aria-labelledby="finish-heading" className="mt-10">
        <h2 id="finish-heading" className="font-display text-2xl font-semibold text-ink">
          {t.finishHeading}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FinishCard tone="bg-mint" done={earned.lesson} doneText={t.markedDone}>
            <Button
              type="button"
              onClick={() => markLessonDone(lesson.id)}
              className="h-12 px-6 text-base"
            >
              <CheckCircleIcon aria-hidden="true" weight="bold" />
              {t.markDone}
            </Button>
          </FinishCard>
          {lesson.quiz.length > 0 && (
            <FinishCard
              tone="bg-lilac"
              done={earned.quiz}
              doneText={t.quizDone}
              doneAction={
                <Link
                  to={studentQuizPath(lesson.id)}
                  className="font-display font-medium text-lilac-ink underline underline-offset-4"
                >
                  {t.quizAgain}
                </Link>
              }
            >
              <Button asChild className="h-12 px-6 text-base">
                <Link to={studentQuizPath(lesson.id)}>
                  <PuzzlePieceIcon aria-hidden="true" weight="duotone" />
                  {t.startQuiz}
                </Link>
              </Button>
            </FinishCard>
          )}
        </div>
      </section>
    </>
  );
}

function ToolButton({
  icon: ToolIcon,
  tone,
  active,
  children,
  ...props
}: {
  icon: typeof TextAaIcon;
  tone: string;
  active: boolean;
  children: ReactNode;
} & ComponentProps<'button'>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'flex items-center gap-2 rounded-2xl py-1.5 pr-4 pl-1.5 font-display font-medium text-ink transition-colors',
        active ? 'bg-card shadow-soft' : 'hover:bg-card/80',
      )}
    >
      <span
        aria-hidden="true"
        className={cn('flex size-9 items-center justify-center', blobShape, tone)}
      >
        <ToolIcon weight="duotone" className="size-5" />
      </span>
      {children}
    </button>
  );
}

/** One way to earn a star: an action, or what was earned once it is done. */
function FinishCard({
  tone,
  done,
  doneText,
  doneAction,
  children,
}: {
  tone: string;
  done: boolean;
  doneText: string;
  doneAction?: ReactNode;
  children: ReactNode;
}) {
  const t = text.student.lesson;
  return (
    <div className={cn('flex flex-col gap-4 rounded-[1.75rem] p-6', tone)}>
      {/* Always rendered so the earned star is announced when it appears. */}
      <div role="status" className="flex items-center gap-3">
        <motion.span
          key={String(done)}
          aria-hidden="true"
          initial={done ? { scale: 0.4, rotate: -30 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 12 }}
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-card"
        >
          <StarIcon
            weight={done ? 'fill' : 'duotone'}
            className={cn('size-7', done ? 'text-butter-deep' : 'text-ink-soft/50')}
          />
        </motion.span>
        <p className="font-display font-semibold text-ink">{done ? doneText : t.plusStar}</p>
      </div>
      {done ? doneAction : children}
    </div>
  );
}

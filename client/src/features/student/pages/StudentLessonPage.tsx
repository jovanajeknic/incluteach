import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  FileDocIcon,
  FootprintsIcon,
  PrinterIcon,
  PuzzlePieceIcon,
  StarIcon,
  TextAaIcon,
  TranslateIcon,
} from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { useSession } from '@/features/auth/api/session';
import { LessonContent } from '@/features/lesson-content/LessonContent';
import { lessonSentences, splitParagraphs } from '@/features/lesson-content/sentences';
import { subjectAppearance } from '@/features/lessons/subjectAppearance';
import {
  backgroundClass,
  readingTextClassName,
  SCRIPT_OPTIONS,
} from '@/features/reading-preferences/readingPreferences';
import { ReadingPreferencesPanel } from '@/features/reading-preferences/ReadingPreferencesPanel';
import { useReadingPreferences } from '@/features/reading-preferences/useReadingPreferences';
import { ApiError } from '@/shared/api/apiClient';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { MessagePage } from '@/shared/components/MessagePage';
import { formatDate } from '@/shared/lib/format';
import { formatClock, useSecondsLeft } from '@/shared/lib/useCountdown';
import { cn } from '@/shared/lib/utils';
import { cyrillicToLatin, displayInScript } from '@/shared/script/serbianScript';
import { Button } from '@/shared/ui/button';
import { SubjectBlob } from '@/shared/visual/SubjectBlob';
import { blobShape } from '@/shared/visual/subjectIcons';
import { text } from '@/text/sr-Latn';
import { useCompleteLesson, useStudentLesson } from '../api/queries';
import type { StudentLesson } from '../api/studentApi';
import { studentErrorMessage } from '../apiErrorMessage';
import { ListenControls } from '../audio/ListenControls';
import { useLessonSpeech } from '../audio/useLessonSpeech';
import { downloadLessonAsWord, lessonDocumentContent } from '../export/lessonExport';
import { TryHistory } from '../components/TryHistory';
import { studentHomePath, studentQuizPath, subjectPath } from '../paths';

const SETTINGS_PANEL_ID = 'reading-settings';

/** A published lesson: the text and the summary, shaped by the student's own settings. */
export function StudentLessonPage() {
  const t = text.pupil.lesson;
  const { lessonId = '' } = useParams();
  const lesson = useStudentLesson(lessonId);

  if (lesson.isPending) return <LoadingState label={text.pupil.load.loading} />;

  if (lesson.isError) {
    const missing =
      lesson.error instanceof ApiError &&
      (lesson.error.status === 404 || lesson.error.status === 403);
    if (!missing) return <ErrorState onRetry={() => void lesson.refetch()} />;
    return (
      <>
        <title>{text.app.pageTitle(t.notFoundTitle)}</title>
        <MessagePage
          title={t.notFoundTitle}
          description={t.notFoundDescription}
          action={
            <Button asChild variant="outline" size="lg">
              <Link to={studentHomePath}>{text.pupil.subject.back}</Link>
            </Button>
          }
        />
      </>
    );
  }

  // Keyed by lesson so the steps, the voice and the open panel start fresh for each lesson.
  return <LessonView key={lesson.data.id} lesson={lesson.data} />;
}

function LessonView({ lesson }: { lesson: StudentLesson }) {
  const t = text.pupil.lesson;
  const { user } = useSession();
  const { preferences, update, reset } = useReadingPreferences(user?.id ?? 'anonymous');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [stepByStep, setStepByStep] = useState(false);
  const [step, setStep] = useState(0);
  const [wordState, setWordState] = useState<'idle' | 'working' | 'done' | 'failed'>('idle');

  // The text is stored as the teacher wrote it; only what is shown is in the chosen script.
  const show = (value: string) => displayInScript(value, preferences.script);
  const body = useMemo(
    () => displayInScript(lesson.body, preferences.script),
    [lesson.body, preferences.script],
  );
  const paragraphs = useMemo(() => splitParagraphs(body), [body]);
  const shownContent = stepByStep ? (paragraphs[step] ?? '') : body;
  // The voice of the browser reads Latin script better, so it always gets Latin, also when the
  // student looks at Cyrillic. The sentences are the same ones, so the highlight stays right.
  const sentences = useMemo(() => lessonSentences(cyrillicToLatin(shownContent)), [shownContent]);
  const speech = useLessonSpeech(sentences);

  const { subject } = lesson;
  const appearance = subjectAppearance(subject.id, subject.name);
  const summary = lesson.summary?.points ?? [];
  const readingClass = cn('text-ink', readingTextClassName(preferences));
  const paperClass = cn(
    'rounded-[2rem] px-6 py-8 shadow-soft sm:px-12 sm:py-12',
    backgroundClass[preferences.background],
    // On paper there is no colour behind the text, and no frame.
    'print:rounded-none print:bg-white print:p-0 print:shadow-none',
  );

  async function saveAsWord() {
    setWordState('working');
    try {
      await downloadLessonAsWord(
        lessonDocumentContent({
          title: lesson.title,
          meta: t.metaLine(subject.name, subject.className),
          dateLine: t.printedOn(formatDate(new Date().toISOString())),
          summaryHeading: t.summaryHeading,
          textHeading: t.textHeading,
          body: lesson.body,
          summaryPoints: summary,
          script: preferences.script,
        }),
        preferences,
      );
      setWordState('done');
    } catch {
      setWordState('failed');
    }
  }

  return (
    <>
      <title>{text.app.pageTitle(lesson.title)}</title>
      <Link
        to={subjectPath(subject.id)}
        className="inline-flex items-center gap-1.5 rounded-full font-display font-medium text-ink-soft hover:text-forest print:hidden"
      >
        <ArrowLeftIcon aria-hidden="true" weight="bold" className="size-4" />
        {t.backToSubject(subject.name)}
      </Link>

      <header className="mt-5 mb-6 flex flex-wrap items-center gap-4 print:mt-0">
        <SubjectBlob subject={appearance} size="lg" className="print:hidden" />
        <div className="min-w-0">
          <h1 className="font-display text-4xl font-semibold tracking-tight break-words text-ink print:text-black">
            {show(lesson.title)}
          </h1>
          {/* Only on paper: who and when, because the page around it is not printed. */}
          <p className="hidden text-base text-black print:block">
            {show(t.metaLine(subject.name, subject.className))} ·{' '}
            {t.printedOn(formatDate(new Date().toISOString()))}
          </p>
        </div>
      </header>

      {/* Tools that change how the lesson is read, heard or saved. They are not printed. */}
      <div className="grid gap-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.75rem] bg-card/70 p-2 shadow-soft">
          <div className="flex flex-wrap items-center gap-1">
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
            <ScriptSwitch
              value={preferences.script}
              onChange={(script) => update('script', script)}
            />
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
        {preferences.script === 'cyrillic' && speech.availability === 'ready' && (
          <p className="px-2 text-sm text-ink-soft">{text.pupil.audio.latinNote}</p>
        )}

        <div role="group" aria-label={t.export.label} className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
            className="h-11 px-4"
          >
            <PrinterIcon aria-hidden="true" weight="bold" />
            {t.export.print}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={wordState === 'working'}
            onClick={() => void saveAsWord()}
            className="h-11 px-4"
          >
            <FileDocIcon aria-hidden="true" weight="bold" />
            {wordState === 'working' ? t.export.wordWorking : t.export.word}
          </Button>
          <p className="text-sm text-ink-soft">{t.export.printHint}</p>
        </div>
        <div role="status" aria-live="polite" className="empty:hidden">
          {wordState === 'done' && <p className="font-medium text-mint-ink">{t.export.wordDone}</p>}
          {wordState === 'failed' && (
            <p role="alert" className="font-medium text-destructive">
              {t.export.wordFailed}
            </p>
          )}
        </div>
      </div>

      {settingsOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 print:hidden"
        >
          <ReadingPreferencesPanel
            id={SETTINGS_PANEL_ID}
            preferences={preferences}
            onChange={update}
            onReset={reset}
            className="rounded-[1.75rem] border-0 bg-butter"
          />
        </motion.div>
      )}

      {summary.length > 0 && (
        <section aria-labelledby="summary-heading" className={cn('mt-4', paperClass, 'print:mb-6')}>
          <h2
            id="summary-heading"
            className="mb-4 font-display text-2xl font-semibold text-ink print:text-black"
          >
            {t.summaryHeading}
          </h2>
          <ul className={cn('list-disc space-y-2 pl-6', readingClass, 'print:text-black')}>
            {summary.map((point, index) => (
              <li key={index}>{show(point)}</li>
            ))}
          </ul>
        </section>
      )}

      <article aria-label={t.textHeading} className={cn('mt-4', paperClass)}>
        {stepByStep && (
          <p
            className="mb-5 flex items-center gap-3 font-display font-medium text-mint-ink print:hidden"
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

        {lesson.body.trim() === '' ? (
          <p className="text-ink-soft">{t.noText}</p>
        ) : (
          // On paper the whole text is printed, also when the screen shows one step at a time.
          <>
            <LessonContent
              content={shownContent}
              activeSentence={speech.activeSentence}
              className={cn(readingClass, stepByStep && 'print:hidden', 'print:text-black')}
            />
            {stepByStep && (
              <LessonContent
                content={body}
                className={cn('hidden print:block print:text-black', readingClass)}
              />
            )}
          </>
        )}

        {stepByStep && (
          <div className="mt-8 flex flex-wrap justify-between gap-3 print:hidden">
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
      </article>

      {lesson.quiz && <QuizCard lesson={lesson} />}
      <FinishCard lesson={lesson} />
      {lesson.quiz && <TryHistory lessonId={lesson.id} script={preferences.script} />}
    </>
  );
}

/** The quiz of the lesson: start it, go on with the open try, or wait for the next one. */
function QuizCard({ lesson }: { lesson: StudentLesson }) {
  const t = text.pupil.lesson;
  const quiz = lesson.myProgress.quiz;
  const waitLeft = useSecondsLeft(quiz?.nextAttemptAt);

  return (
    <section
      aria-labelledby="quiz-heading"
      className="mt-10 rounded-[1.75rem] bg-lilac p-6 print:hidden"
    >
      <h2 id="quiz-heading" className="font-display text-2xl font-semibold text-ink">
        {t.quizHeading}
      </h2>
      <p className="mt-1 text-ink">{t.quizIntro}</p>
      {quiz?.passed && <p className="mt-2 font-medium text-mint-ink">{t.quizPassed}</p>}
      {waitLeft > 0 && (
        <p role="timer" className="mt-2 font-medium text-butter-ink">
          {t.quizWait(formatClock(waitLeft))}
        </p>
      )}
      <Button asChild className="mt-4 h-12 px-6 text-base">
        <Link to={studentQuizPath(lesson.id)}>
          <PuzzlePieceIcon aria-hidden="true" weight="duotone" />
          {quiz?.openAttemptId ? t.continueQuiz : t.startQuiz}
        </Link>
      </Button>
    </section>
  );
}

/** "Završi lekciju": the server says when it works; here only the button follows it. */
function FinishCard({ lesson }: { lesson: StudentLesson }) {
  const t = text.pupil.lesson;
  const complete = useCompleteLesson(lesson.id);
  const [problem, setProblem] = useState<string | null>(null);
  const { completed, completedAt, canFinish } = lesson.myProgress;

  async function finish() {
    setProblem(null);
    try {
      await complete.mutateAsync();
    } catch (error) {
      setProblem(studentErrorMessage(error));
    }
  }

  return (
    <section
      aria-labelledby="finish-heading"
      className="mt-6 rounded-[1.75rem] bg-mint p-6 print:hidden"
    >
      <h2 id="finish-heading" className="font-display text-2xl font-semibold text-ink">
        {t.finishHeading}
      </h2>
      {/* Always rendered, so the result is announced when it appears. */}
      <div role="status" aria-live="polite">
        {completed && (
          <p className="mt-2 flex items-center gap-2 text-lg font-medium text-mint-ink">
            <StarIcon aria-hidden="true" weight="fill" className="size-7 text-butter-deep" />
            {t.finishedAt(formatDate(completedAt ?? new Date().toISOString()))}
          </p>
        )}
      </div>
      {!completed && canFinish && (
        <>
          <p className="mt-1 text-ink">{t.finishText}</p>
          <Button
            type="button"
            className="mt-4 h-12 px-6 text-base"
            disabled={complete.isPending}
            onClick={() => void finish()}
          >
            <CheckCircleIcon aria-hidden="true" weight="bold" />
            {complete.isPending ? t.finishing : t.finish}
          </Button>
        </>
      )}
      {!completed && !canFinish && <p className="mt-1 text-ink">{t.finishNeedsQuiz}</p>}
      {problem && (
        <p role="alert" className="mt-3 font-medium text-destructive">
          {problem}
        </p>
      )}
    </section>
  );
}

/** Latin or Cyrillic: two buttons, one of them pressed. Changes only what is shown. */
function ScriptSwitch({
  value,
  onChange,
}: {
  value: (typeof SCRIPT_OPTIONS)[number];
  onChange: (value: (typeof SCRIPT_OPTIONS)[number]) => void;
}) {
  const labels = text.pupil.reading.script;
  return (
    <div
      role="group"
      aria-label={text.pupil.lesson.scriptLabel}
      className="flex items-center gap-1 rounded-2xl py-1.5 pr-1.5 pl-1.5"
    >
      <span
        aria-hidden="true"
        className={cn('flex size-9 items-center justify-center bg-sky text-sky-ink', blobShape)}
      >
        <TranslateIcon weight="duotone" className="size-5" />
      </span>
      {SCRIPT_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={cn(
            'rounded-xl px-3 py-1.5 font-display font-medium text-ink transition-colors',
            value === option ? 'bg-card shadow-soft' : 'hover:bg-card/80',
          )}
        >
          {labels[option]}
        </button>
      ))}
    </div>
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

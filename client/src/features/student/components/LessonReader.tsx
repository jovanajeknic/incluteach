import {
  ArrowLeftIcon,
  ArrowRightIcon,
  FileDocIcon,
  FootprintsIcon,
  PrinterIcon,
  TextAaIcon,
  TranslateIcon,
} from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import { useSession } from '@/features/auth/api/session';
import { LessonContent } from '@/features/lesson-content/LessonContent';
import { lessonSentences, splitParagraphs } from '@/features/lesson-content/sentences';
import { subjectAppearance } from '@/features/lessons/subjectAppearance';
import {
  backgroundClass,
  readingTextClassName,
  SCRIPT_OPTIONS,
  type ReadingPreferences,
} from '@/features/reading-preferences/readingPreferences';
import { ReadingPreferencesPanel } from '@/features/reading-preferences/ReadingPreferencesPanel';
import { useReadingPreferences } from '@/features/reading-preferences/useReadingPreferences';
import { formatDate } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { cyrillicToLatin, displayInScript } from '@/shared/script/serbianScript';
import { Button } from '@/shared/ui/button';
import { SubjectBlob } from '@/shared/visual/SubjectBlob';
import { blobShape } from '@/shared/visual/subjectIcons';
import { text } from '@/text/sr-Latn';
import type { ReadableLesson } from '../api/studentApi';
import { ListenControls } from '../audio/ListenControls';
import { useLessonSpeech } from '../audio/useLessonSpeech';
import { downloadLessonAsWord, lessonDocumentContent } from '../export/lessonExport';

const SETTINGS_PANEL_ID = 'reading-settings';

interface LessonReaderProps {
  lesson: ReadableLesson;
  /** The link back, at the top. */
  back: ReactNode;
  /** What comes under the text; it gets the reading settings, for example the script. */
  below?: (preferences: ReadingPreferences) => ReactNode;
}

/**
 * A lesson to read: the title, the approved summary and the text, shaped by the settings of the
 * person (letters, colours, script, step by step), read aloud, printed or saved as a Word file.
 * The student and a parent look at a lesson the same way, so they share this.
 */
export function LessonReader({ lesson, back, below }: LessonReaderProps) {
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
  // The sentences are Latin, also when the student looks at Cyrillic; a voice that needs
  // Cyrillic is given it in the hook. The sentences are the same ones, so the highlight stays right.
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
      {back}

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

      {below?.(preferences)}
    </>
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

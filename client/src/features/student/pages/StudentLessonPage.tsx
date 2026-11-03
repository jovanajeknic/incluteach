import { ArrowLeft, ArrowRight, Footprints, Type } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import { text } from '@/text/sr-Latn';
import { ListenControls } from '../audio/ListenControls';
import { useLessonSpeech } from '../audio/useLessonSpeech';
import { useStudent } from '../data/studentContext';
import { pickLessonVersion } from '../lessonVersion';
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

/** A tab clipped to the top edge of the page, like an index tab in an exercise book. */
const tabClassName =
  'relative -mb-px inline-flex items-center gap-2 rounded-t-xl border border-b-0 px-4 py-2 font-display text-sm font-medium text-ink transition-colors';

interface LessonViewProps {
  lesson: StudentLesson;
  subject: Subject;
  profile: StudentProfile;
}

function LessonView({ lesson, subject, profile }: LessonViewProps) {
  const t = text.student.lesson;
  const { markStarted } = useStudent();
  const support = profile.supportProfile;
  // Only teacher-approved versions can be picked; the page is reached only if one exists.
  const version = pickLessonVersion(lesson, support)!;

  const { preferences, update, reset } = useReadingPreferences(profile.id, support.readingPreset);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [stepByStep, setStepByStep] = useState(support.preferStepByStep);
  const [step, setStep] = useState(0);

  const paragraphs = useMemo(() => splitParagraphs(version.content), [version.content]);
  const shownContent = stepByStep ? (paragraphs[step] ?? '') : version.content;
  const sentences = useMemo(() => lessonSentences(shownContent), [shownContent]);
  const speech = useLessonSpeech(sentences);

  useEffect(() => {
    markStarted(lesson.id);
  }, [lesson.id, markStarted]);

  return (
    <>
      <title>{text.app.pageTitle(lesson.title)}</title>
      <Link
        to={subjectPath(subject.id)}
        className="inline-flex items-center gap-1.5 rounded-full text-ink-soft hover:text-forest"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t.backToSubject(subject.name)}
      </Link>

      <header className="mt-4 mb-8 flex flex-wrap items-end gap-x-5 gap-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {lesson.title}
        </h1>
        {/* Says what the student is reading, never why: no reason or diagnosis is shown. */}
        {version.kind === 'simplified' && (
          <span className="hand-note pb-1 text-sky-ink">{t.shorterVersion}</span>
        )}
      </header>

      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
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

      <div className="flex flex-wrap gap-1.5 pl-6 sm:pl-12">
        <button
          type="button"
          aria-expanded={settingsOpen}
          aria-controls={SETTINGS_PANEL_ID}
          onClick={() => setSettingsOpen((open) => !open)}
          className={cn(
            tabClassName,
            'bg-butter hover:bg-butter-deep/50',
            settingsOpen && 'z-10 bg-card',
          )}
        >
          <Type aria-hidden="true" className="size-4" />
          {t.readingSettings}
        </button>
        <button
          type="button"
          aria-pressed={stepByStep}
          onClick={() => {
            setStepByStep((current) => !current);
            setStep(0);
          }}
          className={cn(
            tabClassName,
            'bg-mint hover:bg-mint-deep/50',
            stepByStep && 'z-10 bg-card',
          )}
        >
          <Footprints aria-hidden="true" className="size-4" />
          {t.stepByStep}
        </button>
      </div>

      <div className="paper-stack">
        <article
          aria-label={lesson.title}
          className={cn(
            'paper-sheet py-8 pr-5 sm:py-12 sm:pr-12',
            backgroundClass[preferences.background],
          )}
        >
          {settingsOpen && (
            <div className="mb-8 -rotate-[0.4deg]">
              <ReadingPreferencesPanel
                id={SETTINGS_PANEL_ID}
                preferences={preferences}
                onChange={update}
                onReset={reset}
                className="rounded-md border-butter-deep/60 bg-butter/70 shadow-none"
              />
            </div>
          )}

          {stepByStep && (
            <p className="hand-note mb-3 text-mint-ink" aria-live="polite">
              {t.stepProgress(step + 1, paragraphs.length)}
            </p>
          )}

          <LessonContent
            content={shownContent}
            glossary={lesson.glossary}
            activeSentence={speech.activeSentence}
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
                <ArrowLeft aria-hidden="true" />
                {t.previousStep}
              </Button>
              <Button
                type="button"
                disabled={step >= paragraphs.length - 1}
                onClick={() => setStep((current) => current + 1)}
                className="h-11 px-4"
              >
                {t.nextStep}
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          )}

          {lesson.glossary.length > 0 && (
            <p className="hand-note mt-8 text-blush-ink">↑ {t.glossaryHint}</p>
          )}
        </article>
      </div>

      {lesson.quiz.length > 0 && (
        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <span aria-hidden="true" className="hand-note text-ink-soft">
            {t.quizNote} →
          </span>
          <Button asChild size="lg" className="h-13 px-8 text-base">
            <Link to={studentQuizPath(lesson.id)}>{t.startQuiz}</Link>
          </Button>
        </div>
      )}
    </>
  );
}

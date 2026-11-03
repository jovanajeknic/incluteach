import { ArrowLeft, ArrowRight, Footprints, PencilLine, Type } from 'lucide-react';
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
        className="inline-flex items-center gap-2 rounded-full font-display font-medium text-forest hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-5" />
        {t.backToSubject(subject.name)}
      </Link>

      <header className="mt-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {lesson.title}
        </h1>
        {/* Says what the student is reading, never why: no reason or diagnosis is shown. */}
        {version.kind === 'simplified' && (
          <p className="mt-3 inline-flex rounded-full bg-sky px-3 py-1 font-display text-sm font-medium text-sky-ink">
            {t.shorterVersion}
          </p>
        )}
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          aria-expanded={settingsOpen}
          aria-controls={SETTINGS_PANEL_ID}
          onClick={() => setSettingsOpen((open) => !open)}
          className="h-11 px-4"
        >
          <Type aria-hidden="true" />
          {t.readingSettings}
        </Button>
        <Button
          type="button"
          variant="outline"
          aria-pressed={stepByStep}
          onClick={() => {
            setStepByStep((current) => !current);
            setStep(0);
          }}
          className="h-11 px-4 aria-pressed:border-forest aria-pressed:bg-mint aria-pressed:text-mint-ink"
        >
          <Footprints aria-hidden="true" />
          {t.stepByStep}
        </Button>
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
        <div className="mt-4">
          <ReadingPreferencesPanel
            id={SETTINGS_PANEL_ID}
            preferences={preferences}
            onChange={update}
            onReset={reset}
          />
        </div>
      )}

      <article
        aria-label={lesson.title}
        className={cn(
          'mt-6 rounded-3xl border border-border p-6 shadow-soft sm:p-10',
          backgroundClass[preferences.background],
        )}
      >
        {stepByStep && (
          <p className="mb-4 font-display text-sm font-medium text-ink-soft" aria-live="polite">
            {t.stepProgress(step + 1, paragraphs.length)}
          </p>
        )}
        <LessonContent
          content={shownContent}
          glossary={lesson.glossary}
          activeSentence={speech.activeSentence}
          className={cn('text-ink', readingTextClassName(preferences))}
        />
        {lesson.glossary.length > 0 && (
          <p className="mt-6 border-t border-ink/10 pt-4 text-sm text-ink-soft">{t.glossaryHint}</p>
        )}
        {stepByStep && (
          <div className="mt-6 flex flex-wrap justify-between gap-3">
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
      </article>

      {lesson.quiz.length > 0 && (
        <div className="mt-8 flex justify-center">
          <Button asChild size="lg" className="h-13 px-8 text-base">
            <Link to={studentQuizPath(lesson.id)}>
              <PencilLine aria-hidden="true" />
              {t.startQuiz}
            </Link>
          </Button>
        </div>
      )}
    </>
  );
}

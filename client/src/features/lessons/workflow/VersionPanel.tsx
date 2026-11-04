import {
  CheckCircleIcon,
  MagicWandIcon,
  PencilSimpleIcon,
  PlayIcon,
  SparkleIcon,
  StopIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { useId, useMemo, useState, type FormEvent } from 'react';
import { LessonContent } from '@/features/lesson-content/LessonContent';
import { lessonSentences } from '@/features/lesson-content/sentences';
import { findVersion, useSchool } from '@/features/school/schoolContext';
import type { AdaptedKind, SchoolLesson } from '@/features/school/types';
import { useLessonSpeech } from '@/features/student/audio/useLessonSpeech';
import type { LessonIllustration, LessonVersion } from '@/features/student/types';
import { AiPulse } from '@/shared/visual/AiPulse';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { text } from '@/text/sr-Latn';
import { StatusMessage } from './SectionCard';

const sheetClassName = 'rounded-[1.75rem] bg-card p-6 shadow-soft sm:p-8';

/** One AI version: preview, the teacher's edits, feedback for the AI and approval. */
export function VersionPanel({ lesson, kind }: { lesson: SchoolLesson; kind: AdaptedKind }) {
  const t = text.lessonDetail;
  const school = useSchool();
  const version = findVersion(lesson, kind);
  const redoing = lesson.regenerating?.includes(kind) ?? false;
  const audience = school.versionAudience(lesson)[kind];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <div className={cn(sheetClassName, 'relative min-h-64')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-prose text-ink-soft">{t.kindHints[kind]}</p>
          <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
            <UsersThreeIcon aria-hidden="true" weight="duotone" className="size-5 text-forest" />
            {t.audience(audience)}
          </p>
        </div>

        <div className="mt-6">
          {version ? (
            <VersionBody lesson={lesson} version={version} kind={kind} />
          ) : (
            <div className="py-6">
              <p className="font-display text-lg font-semibold text-ink">{t.missingTitle}</p>
              <p className="mt-1 text-ink-soft">{t.missingText}</p>
              <Button
                type="button"
                disabled={redoing}
                onClick={() => void school.regenerateVersion(lesson.id, kind, '')}
                className="mt-5 h-11 px-5"
              >
                <SparkleIcon aria-hidden="true" weight="fill" />
                {t.create}
              </Button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {redoing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              role="status"
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-[1.75rem] bg-card/90 backdrop-blur-sm"
            >
              <AiPulse size="md" />
              <p className="font-display font-medium text-ink">{t.ai.redoing}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {version && (
        <aside className="grid content-start gap-6">
          <ApproveBox lesson={lesson} version={version} kind={kind} disabled={redoing} />
          <FeedbackForm lesson={lesson} kind={kind} disabled={redoing} />
        </aside>
      )}
    </div>
  );
}

function ApproveBox({
  lesson,
  version,
  kind,
  disabled,
}: {
  lesson: SchoolLesson;
  version: LessonVersion;
  kind: AdaptedKind;
  disabled: boolean;
}) {
  const t = text.lessonDetail;
  const { approveVersion } = useSchool();

  if (version.approvedByTeacher) {
    return (
      <p className="flex items-center gap-2 rounded-3xl bg-mint px-5 py-4 font-display text-lg font-semibold text-mint-ink">
        <CheckCircleIcon aria-hidden="true" weight="duotone" className="size-7" />
        {t.approved}
      </p>
    );
  }
  return (
    <div className="rounded-3xl bg-butter px-5 py-4">
      <p className="flex items-center gap-1.5 font-display font-medium text-butter-ink">
        <SparkleIcon aria-hidden="true" weight="duotone" className="size-5" />
        {t.aiSuggestion}
      </p>
      <Button
        type="button"
        disabled={disabled}
        onClick={() => approveVersion(lesson.id, kind)}
        className="mt-3 h-11 w-full text-base"
      >
        <CheckCircleIcon aria-hidden="true" weight="bold" />
        {t.approve}: {t.kinds[kind]}
      </Button>
    </div>
  );
}

function FeedbackForm({
  lesson,
  kind,
  disabled,
}: {
  lesson: SchoolLesson;
  kind: AdaptedKind;
  disabled: boolean;
}) {
  const t = text.lessonDetail;
  const { regenerateVersion } = useSchool();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string>();
  const fieldId = useId();
  const hintId = useId();
  const errorId = useId();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!note.trim()) {
      setError(t.feedbackRequired);
      return;
    }
    void regenerateVersion(lesson.id, kind, note.trim());
    setNote('');
    setError(undefined);
  }

  return (
    <form noValidate onSubmit={submit} className="rounded-3xl bg-lilac/60 p-5">
      <label htmlFor={fieldId} className="font-display font-semibold text-ink">
        {t.feedbackLabel}
      </label>
      <p id={hintId} className="mt-1 text-sm text-ink-soft">
        {t.feedbackHint}
      </p>
      <Textarea
        id={fieldId}
        rows={3}
        value={note}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${hintId} ${errorId}` : hintId}
        onChange={(event) => {
          setNote(event.target.value);
          setError(undefined);
        }}
        className="mt-3 rounded-2xl bg-card text-base md:text-base"
      />
      {error && (
        <p id={errorId} className="mt-2 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <Button
        type="submit"
        variant="outline"
        disabled={disabled}
        className="mt-3 h-11 w-full border-lilac-ink/40 bg-card text-base text-lilac-ink hover:border-lilac-ink hover:bg-card"
      >
        <MagicWandIcon aria-hidden="true" weight="duotone" />
        {t.redo}
      </Button>
    </form>
  );
}

function VersionBody({
  lesson,
  version,
  kind,
}: {
  lesson: SchoolLesson;
  version: LessonVersion;
  kind: AdaptedKind;
}) {
  if (kind === 'illustrations') {
    return <IllustrationsEditor lesson={lesson} items={version.illustrations ?? []} />;
  }
  return <TextVersionEditor lesson={lesson} version={version} />;
}

/** Preview of a text version with an inline editor; audio gets a listen button. */
export function TextVersionEditor({
  lesson,
  version,
}: {
  lesson: SchoolLesson;
  version: LessonVersion;
}) {
  const t = text.lessonDetail;
  const { updateVersion } = useSchool();
  const [draft, setDraft] = useState<string>();
  const [error, setError] = useState<string>();
  const fieldId = useId();
  const errorId = useId();
  const label = t.kinds[version.kind];

  if (draft !== undefined) {
    return (
      <div className="flex flex-col gap-2">
        <label htmlFor={fieldId} className="font-medium text-ink">
          {t.editLabel(label)}
        </label>
        <Textarea
          id={fieldId}
          rows={12}
          value={draft}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => setDraft(event.target.value)}
          className="min-h-64 rounded-2xl bg-paper text-base leading-relaxed md:text-base"
        />
        {error && (
          <p id={errorId} className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={() => {
              if (!draft.trim()) {
                setError(t.emptyError);
                return;
              }
              updateVersion(lesson.id, version.kind, { content: draft.trim() });
              setDraft(undefined);
              setError(undefined);
            }}
            className="h-10 px-5"
          >
            {t.save}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setDraft(undefined);
              setError(undefined);
            }}
            className="h-10 px-5"
          >
            {t.cancel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <article aria-label={label}>
      {version.kind === 'audio' ? (
        <AudioPreview content={version.content} glossary={lesson.glossary} />
      ) : (
        <LessonContent
          content={version.content}
          glossary={lesson.glossary}
          className={cn(
            'text-lg text-ink',
            // Preview the dyslexia version the way students will read it.
            version.kind === 'dyslexia' && 'font-dyslexic leading-loose tracking-wide',
          )}
        />
      )}
      <Button
        type="button"
        variant="ghost"
        onClick={() => setDraft(version.content)}
        aria-label={`${t.edit}: ${label}`}
        className="mt-6 h-10 px-3 text-forest"
      >
        <PencilSimpleIcon aria-hidden="true" weight="duotone" />
        {t.edit}
      </Button>
    </article>
  );
}

function AudioPreview({
  content,
  glossary,
}: {
  content: string;
  glossary: SchoolLesson['glossary'];
}) {
  const t = text.lessonDetail;
  const sentences = useMemo(() => lessonSentences(content), [content]);
  const speech = useLessonSpeech(sentences);
  const playing = speech.status !== 'idle';

  return (
    <>
      {speech.availability === 'ready' ? (
        <Button
          type="button"
          onClick={playing ? speech.stop : speech.play}
          className="mb-6 h-12 px-6 text-base"
        >
          {playing ? (
            <StopIcon aria-hidden="true" weight="fill" />
          ) : (
            <PlayIcon aria-hidden="true" weight="fill" />
          )}
          {playing ? t.stopListening : t.listen}
        </Button>
      ) : (
        <p className="mb-6 text-sm text-ink-soft">{t.noVoice}</p>
      )}
      <LessonContent
        content={content}
        glossary={glossary}
        activeSentence={speech.activeSentence}
        className="text-lg text-ink"
      />
    </>
  );
}

function IllustrationsEditor({
  lesson,
  items,
}: {
  lesson: SchoolLesson;
  items: LessonIllustration[];
}) {
  const t = text.lessonDetail;
  const { updateVersion } = useSchool();
  const [captions, setCaptions] = useState<string[]>();
  const [saved, setSaved] = useState(false);

  return (
    <div>
      <ul className="grid gap-6 sm:grid-cols-2">
        {items.map((item, index) => (
          <li key={item.id}>
            <figure>
              <motion.img
                src={item.src}
                alt={item.alt}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full rounded-3xl border border-border bg-paper"
              />
              {captions ? (
                <Input
                  aria-label={t.captionLabel(index + 1)}
                  value={captions[index] ?? ''}
                  onChange={(event) =>
                    setCaptions((current) =>
                      current?.map((caption, i) => (i === index ? event.target.value : caption)),
                    )
                  }
                  className="mt-3 h-11 rounded-2xl bg-paper text-base md:text-base"
                />
              ) : (
                <figcaption className="mt-3 text-ink-soft">{item.caption}</figcaption>
              )}
            </figure>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-3">
        {captions ? (
          <>
            <Button
              type="button"
              onClick={() => {
                updateVersion(lesson.id, 'illustrations', {
                  illustrations: items.map((item, i) => ({
                    ...item,
                    caption: captions[i]?.trim() || item.caption,
                  })),
                });
                setCaptions(undefined);
                setSaved(true);
              }}
              className="h-10 px-5"
            >
              {t.save}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCaptions(undefined)}
              className="h-10 px-5"
            >
              {t.cancel}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setCaptions(items.map((item) => item.caption));
              setSaved(false);
            }}
            className="h-10 px-3 text-forest"
          >
            <PencilSimpleIcon aria-hidden="true" weight="duotone" />
            {t.edit}
          </Button>
        )}
      </div>
      <StatusMessage message={saved ? t.sectionSaved : undefined} />
    </div>
  );
}

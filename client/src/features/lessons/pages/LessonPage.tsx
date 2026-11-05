import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftIcon, FileArrowUpIcon, InfoIcon, WarningIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useBlocker, useLocation, useNavigate, useParams } from 'react-router';
import { ApiError } from '@/shared/api/apiClient';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { ErrorState } from '@/shared/components/ErrorState';
import { FormField } from '@/shared/components/FormField';
import { LoadingState } from '@/shared/components/LoadingState';
import { MessagePage } from '@/shared/components/MessagePage';
import { formatDate } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { LessonContent } from '@/features/lesson-content/LessonContent';
import { text } from '@/text/sr-Latn';
import { lessonErrorMessage } from '../apiErrorMessage';
import { BODY_MAX_LENGTH, type Lesson } from '../api/lessonsApi';
import {
  useDeleteLesson,
  useLesson,
  usePublishLesson,
  useUnpublishLesson,
  useUpdateLesson,
  useUploadSource,
} from '../api/queries';
import { LessonStateBadge } from '../components/LessonStateBadge';
import { checkLessonFile, editLessonSchema, type EditLessonFormValues } from '../lessonFormSchemas';
import type { LessonPageState } from '../lessonPageState';
import { ReviewSection } from '../review/ReviewSection';
import { subjectLessonsPath, teacherHomePath } from '../paths';

/** One lesson: its text (edited here), what the AI made, and publishing. */
export function LessonPage() {
  const t = text.teacher.lesson;
  const { lessonId = '' } = useParams();
  const lesson = useLesson(lessonId);

  if (lesson.isPending) return <LoadingState label={text.teacher.load.loading} />;

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
              <Link to={teacherHomePath}>{t.backToSubjects}</Link>
            </Button>
          }
        />
      </>
    );
  }

  return <LessonView lesson={lesson.data} />;
}

function LessonView({ lesson }: { lesson: Lesson }) {
  const t = text.teacher.lesson;
  const navigate = useNavigate();
  const location = useLocation();
  const arrival = (location.state ?? {}) as LessonPageState;

  const update = useUpdateLesson(lesson.id);
  const upload = useUploadSource();
  const publish = usePublishLesson(lesson.id);
  const unpublish = useUnpublishLesson(lesson.id);
  const remove = useDeleteLesson(lesson.id);

  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(arrival.uploadError ?? null);
  const [warnings, setWarnings] = useState(arrival.warnings ?? []);
  const [uploaded, setUploaded] = useState(arrival.uploaded ?? false);
  const fileInput = useRef<HTMLInputElement>(null);

  const locked = lesson.status === 'published' || lesson.status === 'processing';
  // The summary and the quiz have forms of their own; any of them with unsaved edits counts.
  const [dirtyParts, setDirtyParts] = useState<Record<string, boolean>>({});
  const onPartDirty = useCallback(
    (part: string, dirty: boolean) =>
      setDirtyParts((current) =>
        current[part] === dirty ? current : { ...current, [part]: dirty },
      ),
    [],
  );
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<EditLessonFormValues>({
    resolver: zodResolver(editLessonSchema),
    values: { title: lesson.title, body: lesson.body },
  });
  const body = useWatch({ control, name: 'body' });
  const saving = update.isPending;
  const unsaved = isDirty || Object.values(dirtyParts).some(Boolean);

  // Leaving with unsaved changes asks first (in the app and when closing the tab).
  const blocker = useBlocker(unsaved && !saving);
  // Choosing "Napusti" closes the dialog too, and that must not cancel the move it allowed.
  const leaving = useRef(false);
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

  function clearMessages() {
    setNotice(null);
    setProblem(null);
    setWarnings([]);
    setUploaded(false);
  }

  async function onSave(values: EditLessonFormValues) {
    clearMessages();
    try {
      await update.mutateAsync(values);
      setNotice(t.saved);
    } catch (error) {
      setProblem(lessonErrorMessage(error));
    }
  }

  async function onFileChosen(file: File | undefined) {
    if (!file) return;
    clearMessages();
    const fileProblem = checkLessonFile(file);
    if (fileProblem) {
      setProblem(text.teacher.newLesson.errors[fileProblem]);
      return;
    }
    try {
      const answer = await upload.mutateAsync({ id: lesson.id, file });
      reset({ title: answer.lesson.title, body: answer.lesson.body });
      setWarnings(answer.warnings);
      setUploaded(true);
    } catch (error) {
      setProblem(lessonErrorMessage(error));
    }
  }

  async function run(action: () => Promise<unknown>, then?: () => void) {
    clearMessages();
    try {
      await action();
      then?.();
    } catch (error) {
      setProblem(lessonErrorMessage(error));
    }
  }

  const busy = saving || upload.isPending || publish.isPending || unpublish.isPending;
  const canDelete = lesson.status === 'draft' || lesson.status === 'in_review';

  return (
    <>
      <title>{text.app.pageTitle(lesson.title)}</title>
      <Link
        to={subjectLessonsPath(lesson.subject.id)}
        className="inline-flex items-center gap-1.5 rounded-full font-display font-medium text-ink-soft hover:text-forest"
      >
        <ArrowLeftIcon aria-hidden="true" weight="bold" className="size-4" />
        {lesson.subject.name} · {text.teacher.home.classHeading(lesson.subject.className)}
      </Link>

      <header className="mt-5">
        <h1 className="font-display text-4xl font-semibold tracking-tight break-words text-ink">
          {lesson.title}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-soft">
          <LessonStateBadge state={lesson.status} />
          <span>{sourceLabel(lesson)}</span>
        </p>
      </header>

      {/* One live region for everything that happens after a click, so it is announced. */}
      <div role="status" aria-live="polite" className="mt-6 grid gap-3 empty:hidden">
        {notice && <Message tone="good">{notice}</Message>}
        {uploaded && <Message tone="good">{t.uploadDone}</Message>}
        {warnings.map((warning) => (
          <Message key={warning.code} tone="note">
            {t.imagesNotIncluded(warning.count)}
          </Message>
        ))}
      </div>
      {problem && (
        <div role="alert" className="mt-3">
          <Message tone="bad">{problem}</Message>
        </div>
      )}

      {lesson.status === 'published' ? (
        <section className="mt-8" aria-label={t.bodyLabel}>
          <Message tone="note">{t.readOnlyPublished}</Message>
          <div className="mt-6">
            <LessonContent content={lesson.body} />
          </div>
        </section>
      ) : (
        // noValidate: our own accessible messages replace the browser's pop-ups.
        <form noValidate onSubmit={handleSubmit(onSave)} className="mt-8 flex flex-col gap-6">
          <FormField id="lesson-title" label={t.titleLabel} error={errors.title?.message} required>
            {(props) => (
              <Input
                {...props}
                {...register('title')}
                readOnly={locked}
                className="h-12 rounded-2xl bg-card text-base md:text-base"
              />
            )}
          </FormField>

          <div>
            <FormField id="lesson-body" label={t.bodyLabel} error={errors.body?.message}>
              {(props) => (
                <Textarea
                  {...props}
                  {...register('body')}
                  readOnly={locked}
                  rows={14}
                  className="min-h-80 rounded-2xl bg-card text-base leading-relaxed md:text-base"
                />
              )}
            </FormField>
            <p
              className={cn(
                'mt-2 text-sm',
                body.length > BODY_MAX_LENGTH ? 'font-medium text-destructive' : 'text-ink-soft',
              )}
            >
              {t.counter(body.length, BODY_MAX_LENGTH)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              size="lg"
              disabled={locked || busy || !isDirty}
              className="h-12 px-6"
            >
              {saving ? t.saving : t.save}
            </Button>
            {isDirty && <span className="text-sm text-ink-soft">{t.unsaved}</span>}

            <ConfirmDialog
              trigger={
                <Button type="button" variant="outline" size="lg" disabled={locked || busy}>
                  <FileArrowUpIcon aria-hidden="true" weight="bold" />
                  {upload.isPending ? t.uploading : t.replaceFile}
                </Button>
              }
              title={t.replaceTitle}
              description={t.replaceText}
              confirmLabel={t.replaceYes}
              cancelLabel={t.cancel}
              onConfirm={() => fileInput.current?.click()}
            />
            <input
              ref={fileInput}
              type="file"
              accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              aria-label={t.replaceFile}
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => {
                void onFileChosen(event.target.files?.[0]);
                // The same file can be chosen again after a failure.
                event.target.value = '';
              }}
            />
          </div>
        </form>
      )}

      <ReviewSection lesson={lesson} textDirty={isDirty} onDirtyChange={onPartDirty} />

      <section className="mt-10 flex flex-wrap items-center gap-3 border-t border-border pt-6">
        {lesson.status === 'published' ? (
          <>
            <p className="mr-auto text-ink-soft">
              {t.publishedAt(formatDate(lesson.publishedAt ?? lesson.updatedAt))}
            </p>
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={busy}
              onClick={() => void run(() => unpublish.mutateAsync())}
            >
              {unpublish.isPending ? t.unpublishing : t.unpublish}
            </Button>
          </>
        ) : (
          <>
            <p className="mr-auto text-ink-soft">{t.draftHint}</p>
            {canDelete && (
              <ConfirmDialog
                destructive
                trigger={
                  <Button type="button" variant="outline" size="lg" disabled={busy}>
                    {t.delete}
                  </Button>
                }
                title={t.deleteTitle}
                description={t.deleteText}
                confirmLabel={t.deleteYes}
                cancelLabel={t.cancel}
                onConfirm={() =>
                  void run(
                    () => remove.mutateAsync(),
                    () => void navigate(subjectLessonsPath(lesson.subject.id), { replace: true }),
                  )
                }
              />
            )}
            <Button
              type="button"
              size="lg"
              // Publishing sends what is saved, so unsaved edits must be saved first.
              disabled={busy || unsaved || lesson.status === 'processing'}
              onClick={() => void run(() => publish.mutateAsync())}
              className="h-12 px-6"
            >
              {publish.isPending ? t.publishing : t.publish}
            </Button>
          </>
        )}
      </section>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open && blocker.state === 'blocked' && !leaving.current) blocker.reset();
        }}
        title={t.leaveTitle}
        description={t.leaveText}
        confirmLabel={t.leaveGo}
        cancelLabel={t.leaveStay}
        destructive
        onConfirm={() => {
          if (blocker.state !== 'blocked') return;
          leaving.current = true;
          blocker.proceed();
        }}
      />
    </>
  );
}

function sourceLabel(lesson: Lesson): string {
  const t = text.teacher.lesson.source;
  if (lesson.source === 'docx') return t.docx(lesson.sourceFileName);
  if (lesson.source === 'pdf') return t.pdf(lesson.sourceFileName);
  return t.pasted;
}

type Tone = 'good' | 'note' | 'bad';

const tones: Record<Tone, string> = {
  good: 'bg-mint text-mint-ink',
  note: 'bg-butter text-butter-ink',
  bad: 'bg-blush text-blush-ink',
};

function Message({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const MessageIcon = tone === 'bad' ? WarningIcon : InfoIcon;
  return (
    <p className={cn('flex items-start gap-2 rounded-2xl px-4 py-3 font-medium', tones[tone])}>
      <MessageIcon aria-hidden="true" weight="fill" className="mt-0.5 size-5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

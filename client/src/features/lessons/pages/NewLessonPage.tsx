import { zodResolver } from '@hookform/resolvers/zod';
import { FileArrowUpIcon } from '@phosphor-icons/react';
import { Tabs } from 'radix-ui';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { SubmitOutcomeMessage, type SubmitOutcome } from '@/features/auth/components/AuthStatus';
import { ErrorState } from '@/shared/components/ErrorState';
import { FormField } from '@/shared/components/FormField';
import { LoadingState } from '@/shared/components/LoadingState';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { SubjectBlob } from '@/shared/visual/SubjectBlob';
import { text } from '@/text/sr-Latn';
import { lessonErrorMessage } from '../apiErrorMessage';
import { BODY_MAX_LENGTH } from '../api/lessonsApi';
import { useCreateLesson, useMySubjects, useUploadSource } from '../api/queries';
import {
  checkLessonFile,
  newLessonSchema,
  type NewLessonFormInput,
  type NewLessonFormValues,
} from '../lessonFormSchemas';
import type { LessonPageState } from '../lessonPageState';
import { lessonPath, subjectLessonsPath, teacherHomePath } from '../paths';
import { subjectAppearance } from '../subjectAppearance';

const controlClassName = 'h-12 rounded-2xl bg-card text-base md:text-base';

export function NewLessonPage() {
  const t = text.teacher.newLesson;
  const subjects = useMySubjects();

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <h1 className="mb-8 font-display text-4xl font-semibold tracking-tight text-ink">
        {t.heading}
      </h1>
      <div className="max-w-4xl">
        {subjects.isPending ? (
          <LoadingState label={text.teacher.load.loading} />
        ) : subjects.isError ? (
          <ErrorState onRetry={() => void subjects.refetch()} />
        ) : subjects.data.subjects.length === 0 ? (
          <p className="text-lg text-ink-soft">{t.noSubjects}</p>
        ) : (
          <LessonForm subjects={subjects.data.subjects} />
        )}
      </div>
    </>
  );
}

function LessonForm({
  subjects,
}: {
  subjects: NonNullable<ReturnType<typeof useMySubjects>['data']>['subjects'];
}) {
  const t = text.teacher.newLesson;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const create = useCreateLesson();
  const upload = useUploadSource();
  const [outcome, setOutcome] = useState<SubmitOutcome>(null);

  const preselected = subjects.find((subject) => subject.id === params.get('subject'));
  const {
    register,
    handleSubmit,
    control,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<NewLessonFormInput, unknown, NewLessonFormValues>({
    resolver: zodResolver(newLessonSchema),
    defaultValues: {
      // A teacher with one subject does not have to pick it.
      subjectId: preselected?.id ?? (subjects.length === 1 ? subjects[0]!.id : ''),
      title: '',
      mode: 'paste',
      body: '',
      file: null,
    },
  });
  const mode = useWatch({ control, name: 'mode' });
  const body = useWatch({ control, name: 'body' });
  const file = useWatch({ control, name: 'file' });

  async function onValid(values: NewLessonFormValues) {
    setOutcome(null);
    let lessonId: string;
    try {
      const { lesson } = await create.mutateAsync({
        subjectId: values.subjectId,
        title: values.title,
        body: values.mode === 'paste' ? values.body : undefined,
      });
      lessonId = lesson.id;
    } catch (error) {
      // Nothing was created and the form keeps everything that was typed.
      setOutcome({ kind: 'error', message: lessonErrorMessage(error) });
      return;
    }

    if (values.mode === 'file' && values.file) {
      let state: LessonPageState;
      try {
        const { warnings } = await upload.mutateAsync({ id: lessonId, file: values.file });
        state = { uploaded: true, warnings };
      } catch (error) {
        // The lesson exists as an empty draft; its page tells what went wrong and offers a retry.
        state = {
          uploadError: `${text.teacher.lesson.uploadFailedAfterCreate} ${lessonErrorMessage(error)}`,
        };
      }
      void navigate(lessonPath(lessonId), { state });
      return;
    }
    void navigate(lessonPath(lessonId));
  }

  return (
    // noValidate: we show our own accessible messages instead of browser pop-ups.
    <form
      noValidate
      onSubmit={handleSubmit(onValid, () => setOutcome(null))}
      className="flex flex-col gap-8"
    >
      <fieldset aria-describedby={errors.subjectId ? 'lesson-subject-error' : undefined}>
        <legend className="mb-3 text-base font-medium">{t.subjectLabel}</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <label
              key={subject.id}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-3xl border-2 border-transparent bg-card p-3 shadow-soft transition-[border-color,transform] duration-200 hover:-translate-y-0.5',
                'has-[:checked]:border-forest has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-ring',
              )}
            >
              <input
                type="radio"
                value={subject.id}
                {...register('subjectId')}
                aria-invalid={Boolean(errors.subjectId)}
                className="sr-only"
              />
              <SubjectBlob subject={subjectAppearance(subject.id, subject.name)} />
              <span className="min-w-0">
                <span className="block font-display font-semibold text-ink">{subject.name}</span>
                <span className="block text-sm text-ink-soft">
                  {text.teacher.home.classHeading(subject.className)}
                </span>
              </span>
            </label>
          ))}
        </div>
        {errors.subjectId && (
          <p id="lesson-subject-error" className="mt-2 text-sm font-medium text-destructive">
            {errors.subjectId.message}
          </p>
        )}
      </fieldset>

      <FormField id="lesson-title" label={t.titleLabel} error={errors.title?.message} required>
        {(props) => <Input {...props} {...register('title')} className={controlClassName} />}
      </FormField>

      <Tabs.Root
        value={mode}
        onValueChange={(next) => {
          setValue('mode', next as 'paste' | 'file');
          // The other source's error does not apply any more.
          void trigger(['body', 'file']);
        }}
      >
        <p className="mb-3 text-base font-medium">{t.sourceLabel}</p>
        <Tabs.List aria-label={t.sourceLabel} className="flex gap-6">
          {(['paste', 'file'] as const).map((option) => (
            <Tabs.Trigger
              key={option}
              value={option}
              className={cn(
                'border-b-4 pb-2 font-display text-lg font-medium transition-colors',
                mode === option
                  ? 'border-ochre text-ink'
                  : 'border-transparent text-ink-soft hover:text-ink',
              )}
            >
              {option === 'paste' ? t.pasteTab : t.fileTab}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="paste" className="mt-5 focus-visible:outline-none">
          <FormField
            id="lesson-body"
            label={t.bodyLabel}
            hint={t.bodyHint}
            error={errors.body?.message}
            required
          >
            {(props) => (
              <Textarea
                {...props}
                {...register('body')}
                rows={10}
                className="min-h-64 rounded-2xl bg-card text-base leading-relaxed md:text-base"
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
        </Tabs.Content>

        <Tabs.Content value="file" className="mt-5 focus-visible:outline-none">
          <FormField
            id="lesson-file"
            label={t.fileLabel}
            hint={t.fileHint}
            error={errors.file?.message}
            required
          >
            {(props) => (
              <Input
                {...props}
                type="file"
                accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => {
                  setValue('file', event.target.files?.[0] ?? null, { shouldValidate: true });
                }}
                className={cn(controlClassName, 'h-auto py-3')}
              />
            )}
          </FormField>
          {file && !checkLessonFile(file) && (
            <p className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
              <FileArrowUpIcon aria-hidden="true" weight="duotone" className="size-5" />
              {t.fileChosen(file.name)}
            </p>
          )}
        </Tabs.Content>
      </Tabs.Root>

      <div className="flex flex-col gap-3">
        <SubmitOutcomeMessage outcome={outcome} />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button asChild variant="outline" size="lg" className="h-12 px-6">
            <Link to={preselected ? subjectLessonsPath(preselected.id) : teacherHomePath}>
              {t.cancel}
            </Link>
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="h-12 px-6"
          >
            {isSubmitting ? (mode === 'file' ? text.teacher.lesson.uploading : t.saving) : t.save}
          </Button>
        </div>
      </div>
    </form>
  );
}

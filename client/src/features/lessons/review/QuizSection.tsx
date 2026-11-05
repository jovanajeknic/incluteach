import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  PlusIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import {
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from 'react-hook-form';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { text } from '@/text/sr-Latn';
import { lessonErrorMessage } from '../apiErrorMessage';
import {
  QUIZ_EXPLANATION_MAX_LENGTH,
  QUIZ_MAX_QUESTIONS,
  QUIZ_OPTION_MAX_LENGTH,
  QUIZ_PROMPT_MAX_LENGTH,
  type Lesson,
  type Quiz,
} from '../api/lessonsApi';
import { useApproveQuiz, useDeleteQuiz, useSaveQuiz } from '../api/queries';
import { PartState } from './PartState';
import {
  CHOICE_MAX_OPTIONS,
  CHOICE_MIN_OPTIONS,
  NO_ANSWER,
  formToRequest,
  newQuestion,
  quizSchema,
  quizToForm,
  type QuizFormInput,
  type QuizFormValues,
} from './quizForm';

const t = text.teacher.review.quiz;

interface QuizSectionProps {
  lesson: Lesson;
  /** Published, or the AI is working: nothing can be changed. */
  locked: boolean;
  onDirtyChange: (part: string, dirty: boolean) => void;
}

/** The quiz of the lesson: made by the AI or written by hand, edited and approved here. */
export function QuizSection({ lesson, locked, onDirtyChange }: QuizSectionProps) {
  const quiz = lesson.quiz;
  const remove = useDeleteQuiz(lesson.id);
  const [writing, setWriting] = useState(false);
  // Kept here, not in the form: after saving or deleting, the form is replaced or gone.
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  async function onDelete() {
    try {
      await remove.mutateAsync();
      setWriting(false);
      setProblem(null);
      setNotice(t.removed);
    } catch (error) {
      setNotice(null);
      setProblem(lessonErrorMessage(error));
    }
  }

  return (
    <section aria-labelledby="quiz-heading" className="mt-10">
      <h3 id="quiz-heading" className="font-display text-xl font-semibold text-ink">
        {t.heading}
      </h3>

      {quiz || writing ? (
        locked ? (
          <ReadOnlyQuiz quiz={quiz} />
        ) : (
          <>
            <p className="mt-2 max-w-2xl text-ink-soft">{t.intro}</p>
            <QuizForm
              key={quiz?.updatedAt ?? 'new'}
              lesson={lesson}
              quiz={quiz}
              onDirtyChange={onDirtyChange}
              onNotice={(message) => {
                setProblem(null);
                setNotice(message);
              }}
              onProblem={(message) => {
                setNotice(null);
                setProblem(message);
              }}
              onDelete={quiz ? () => void onDelete() : undefined}
            />
          </>
        )
      ) : (
        <div className="mt-3">
          <p className="text-ink-soft">{t.none}</p>
          {!locked && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="mt-3"
              onClick={() => {
                setNotice(null);
                setWriting(true);
              }}
            >
              {t.write}
            </Button>
          )}
        </div>
      )}

      <div role="status" aria-live="polite" className="empty:hidden">
        {notice && <p className="mt-3 font-medium text-mint-ink">{notice}</p>}
      </div>
      {problem && (
        <p role="alert" className="mt-3 font-medium text-destructive">
          {problem}
        </p>
      )}
    </section>
  );
}

function ReadOnlyQuiz({ quiz }: { quiz: Quiz | null }) {
  if (!quiz) return null;
  return (
    <>
      <PartState origin={quiz.origin} status={quiz.status} outdated={quiz.outdated} />
      <ol className="mt-4 grid gap-4">
        {quiz.questions.map((question, index) => (
          <li key={question.id} className="rounded-2xl bg-card p-4 shadow-soft">
            <p className="font-display font-semibold text-ink">
              {index + 1}. {question.prompt}
            </p>
            <ul className="mt-2 grid gap-1">
              {question.options.map((option) => (
                <li key={option.id} className="flex items-start gap-2 text-ink">
                  {option.isCorrect && (
                    <CheckCircleIcon
                      aria-hidden="true"
                      weight="fill"
                      className="mt-0.5 size-5 shrink-0 text-mint-ink"
                    />
                  )}
                  <span className={option.isCorrect ? 'font-medium' : 'ml-7'}>
                    {option.text}
                    {option.isCorrect && <span className="sr-only"> ({t.correctAnswer})</span>}
                  </span>
                </li>
              ))}
            </ul>
            {question.explanation && (
              <p className="mt-2 text-sm text-ink-soft">
                {t.explanationShown}: {question.explanation}
              </p>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}

interface QuizFormProps {
  lesson: Lesson;
  quiz: Quiz | null;
  onDirtyChange: (part: string, dirty: boolean) => void;
  onNotice: (message: string) => void;
  onProblem: (message: string) => void;
  onDelete?: () => void;
}

function QuizForm({ lesson, quiz, onDirtyChange, onNotice, onProblem, onDelete }: QuizFormProps) {
  const save = useSaveQuiz(lesson.id);
  const approve = useApproveQuiz(lesson.id);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isDirty },
  } = useForm<QuizFormInput, unknown, QuizFormValues>({
    resolver: zodResolver(quizSchema),
    defaultValues: quizToForm(quiz),
  });
  const { fields, append, remove, move } = useFieldArray({ control, name: 'questions' });

  // The page asks before leaving with edits that were not saved.
  useEffect(() => {
    onDirtyChange('quiz', isDirty);
    return () => onDirtyChange('quiz', false);
  }, [isDirty, onDirtyChange]);

  const busy = save.isPending || approve.isPending;
  const canApprove = quiz !== null && !isDirty && (quiz.status === 'draft' || quiz.outdated);
  const listError = errors.questions?.root?.message ?? errors.questions?.message;

  // `mutateAsync`, not `mutate` with callbacks: a saved quiz replaces this form with a new
  // one, and callbacks of a form that is gone would never run. The messages live in the parent.
  async function onSave(values: QuizFormValues) {
    try {
      await save.mutateAsync(formToRequest(values));
      onNotice(t.saved);
    } catch (error) {
      onProblem(lessonErrorMessage(error));
    }
  }

  async function onApprove() {
    try {
      await approve.mutateAsync();
      onNotice(t.approved);
    } catch (error) {
      onProblem(lessonErrorMessage(error));
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSave)} className="mt-2">
      {quiz && <PartState origin={quiz.origin} status={quiz.status} outdated={quiz.outdated} />}

      <ol className="mt-4 grid gap-5">
        {fields.map((field, index) => (
          <li key={field.id} className="rounded-3xl bg-card p-5 shadow-soft">
            <QuestionCard
              index={index}
              count={fields.length}
              control={control}
              register={register}
              setValue={setValue}
              errors={errors}
              onMove={(to) => move(index, to)}
              onRemove={() => remove(index)}
            />
          </li>
        ))}
      </ol>
      {listError && (
        <p role="alert" className="mt-3 font-medium text-destructive">
          {listError}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={fields.length >= QUIZ_MAX_QUESTIONS}
          onClick={() => append(newQuestion('choice'))}
        >
          <PlusIcon aria-hidden="true" weight="bold" />
          {t.addChoice}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={fields.length >= QUIZ_MAX_QUESTIONS}
          onClick={() => append(newQuestion('true_false'))}
        >
          <PlusIcon aria-hidden="true" weight="bold" />
          {t.addTrueFalse}
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={busy || !isDirty}>
          {save.isPending ? t.saving : t.save}
        </Button>
        {quiz && (
          <Button
            type="button"
            size="lg"
            variant="accent"
            disabled={busy || !canApprove}
            onClick={() => void onApprove()}
          >
            {approve.isPending ? t.approving : t.approve}
          </Button>
        )}
        {onDelete && (
          <ConfirmDialog
            destructive
            trigger={
              <Button type="button" variant="outline" size="lg" disabled={busy}>
                {t.removeAll}
              </Button>
            }
            title={t.removeTitle}
            description={t.removeText}
            confirmLabel={t.removeYes}
            cancelLabel={text.teacher.review.generate.cancel}
            onConfirm={onDelete}
          />
        )}
      </div>
      {quiz && isDirty && <p className="mt-2 text-sm text-ink-soft">{t.approveFirstSave}</p>}
    </form>
  );
}

interface QuestionCardProps {
  index: number;
  count: number;
  control: Control<QuizFormInput, unknown, QuizFormValues>;
  register: UseFormRegister<QuizFormInput>;
  setValue: UseFormSetValue<QuizFormInput>;
  errors: FieldErrors<QuizFormInput>;
  onMove: (to: number) => void;
  onRemove: () => void;
}

/** One question: its text, its answers with the right one marked, and the explanation. */
function QuestionCard({
  index,
  count,
  control,
  register,
  setValue,
  errors,
  onMove,
  onRemove,
}: QuestionCardProps) {
  const number = index + 1;
  const question = useWatch({ control, name: `questions.${index}` });
  const options = useFieldArray({ control, name: `questions.${index}.options` });
  const own = errors.questions?.[index];
  const isChoice = question.kind === 'choice';
  const optionsError = own?.options?.root?.message ?? own?.options?.message;
  const promptId = `question-${index}-prompt`;
  const explanationId = `question-${index}-explanation`;

  function markCorrect(optionIndex: number) {
    setValue(`questions.${index}.correct`, optionIndex, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function removeOption(optionIndex: number) {
    // The right answer must not silently become another one: if it goes, nothing is marked.
    const correct = question.correct;
    markCorrect(
      optionIndex === correct ? NO_ANSWER : optionIndex < correct ? correct - 1 : correct,
    );
    options.remove(optionIndex);
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-display text-lg font-semibold text-ink">
          {t.questionHeading(number)}
          <span className="ml-2 text-sm font-medium text-ink-soft">· {t.kinds[question.kind]}</span>
        </h4>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={index === 0}
            aria-label={t.up(number)}
            onClick={() => onMove(index - 1)}
          >
            <ArrowUpIcon aria-hidden="true" weight="bold" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={index === count - 1}
            aria-label={t.down(number)}
            onClick={() => onMove(index + 1)}
          >
            <ArrowDownIcon aria-hidden="true" weight="bold" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t.removeQuestion(number)}
            onClick={onRemove}
          >
            <TrashIcon aria-hidden="true" weight="bold" />
          </Button>
        </div>
      </div>

      <label htmlFor={promptId} className="mt-4 block font-medium text-ink">
        {t.promptLabel(number)}
      </label>
      <Textarea
        id={promptId}
        rows={2}
        aria-invalid={Boolean(own?.prompt)}
        aria-describedby={own?.prompt ? `${promptId}-error` : undefined}
        className="mt-2 rounded-xl bg-card text-base md:text-base"
        {...register(`questions.${index}.prompt`)}
      />
      <Counter used={question.prompt.length} max={QUIZ_PROMPT_MAX_LENGTH} />
      <FieldError id={`${promptId}-error`} message={own?.prompt?.message} />

      <fieldset
        className="mt-5"
        aria-describedby={own?.correct ? `question-${index}-correct-error` : undefined}
      >
        <legend className="font-medium text-ink">{t.correctHint}</legend>
        <ul className="mt-2 grid gap-3">
          {options.fields.map((optionField, optionIndex) => {
            const optionError = own?.options?.[optionIndex]?.text?.message;
            const optionId = `question-${index}-option-${optionField.id}`;
            return (
              <li key={optionField.id} className="flex flex-wrap items-start gap-3">
                <input
                  type="radio"
                  name={`question-${index}-correct`}
                  checked={question.correct === optionIndex}
                  onChange={() => markCorrect(optionIndex)}
                  aria-label={
                    isChoice
                      ? t.correctLabel(number, optionIndex + 1)
                      : t.trueFalseLabel(number, question.options[optionIndex]?.text ?? '')
                  }
                  className="mt-3 size-5 accent-forest"
                />
                {isChoice ? (
                  <div className="min-w-0 flex-1">
                    <Input
                      id={optionId}
                      aria-label={t.optionLabel(number, optionIndex + 1)}
                      aria-invalid={Boolean(optionError)}
                      aria-describedby={optionError ? `${optionId}-error` : undefined}
                      className="h-11 rounded-xl bg-card text-base md:text-base"
                      {...register(`questions.${index}.options.${optionIndex}.text`)}
                    />
                    <Counter
                      used={question.options[optionIndex]?.text.length ?? 0}
                      max={QUIZ_OPTION_MAX_LENGTH}
                    />
                    <FieldError id={`${optionId}-error`} message={optionError} />
                  </div>
                ) : (
                  // True or false: the two answers are fixed, only the right one is chosen.
                  <span className="mt-2.5 font-display text-lg font-medium text-ink">
                    {question.options[optionIndex]?.text}
                  </span>
                )}
                {isChoice && options.fields.length > CHOICE_MIN_OPTIONS && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={t.removeOption(number, optionIndex + 1)}
                    onClick={() => removeOption(optionIndex)}
                  >
                    <TrashIcon aria-hidden="true" weight="bold" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        <FieldError id={`question-${index}-correct-error`} message={own?.correct?.message} />
        <FieldError id={`question-${index}-options-error`} message={optionsError} />
        {isChoice && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={options.fields.length >= CHOICE_MAX_OPTIONS}
            onClick={() => options.append({ text: '' })}
          >
            <PlusIcon aria-hidden="true" weight="bold" />
            {t.addOption}
          </Button>
        )}
      </fieldset>

      <label htmlFor={explanationId} className="mt-5 block font-medium text-ink">
        {t.explanationLabel(number)}
      </label>
      <Textarea
        id={explanationId}
        rows={2}
        aria-invalid={Boolean(own?.explanation)}
        aria-describedby={own?.explanation ? `${explanationId}-error` : undefined}
        className="mt-2 rounded-xl bg-card text-base md:text-base"
        {...register(`questions.${index}.explanation`)}
      />
      <Counter used={question.explanation.length} max={QUIZ_EXPLANATION_MAX_LENGTH} />
      <FieldError id={`${explanationId}-error`} message={own?.explanation?.message} />
    </>
  );
}

function Counter({ used, max }: { used: number; max: number }) {
  return (
    <p
      className={cn('mt-1 text-sm', used > max ? 'font-medium text-destructive' : 'text-ink-soft')}
    >
      {t.counter(used, max)}
    </p>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-sm font-medium text-destructive">
      {message}
    </p>
  );
}

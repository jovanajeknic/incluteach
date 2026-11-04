import { SparkleIcon } from '@phosphor-icons/react';
import { useRef, useState, type FormEvent } from 'react';
import type { NewLessonInput } from '@/features/school/schoolContext';
import { useSchool } from '@/features/school/schoolContext';
import type { TeachingAssignment } from '@/features/school/types';
import { SubjectBlob } from '@/shared/visual/SubjectBlob';
import { FormField } from '@/shared/components/FormField';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { text } from '@/text/sr-Latn';
import {
  courseKey,
  lessonFormFieldOrder,
  validateLessonForm,
  type LessonFormErrors,
  type LessonFormField,
  type LessonFormValues,
} from '../lessonForm';

interface LessonFormProps {
  teaching: readonly TeachingAssignment[];
  /** Preselected course, e.g. when the form is opened from a subject page. */
  initialCourse?: string;
  onSubmit: (input: NewLessonInput) => void;
  onCancel: () => void;
}

const controlClassName = 'h-12 rounded-2xl bg-card text-base md:text-base';

export function LessonForm({ teaching, initialCourse = '', onSubmit, onCancel }: LessonFormProps) {
  const t = text.newLesson;
  const school = useSchool();
  const [values, setValues] = useState<LessonFormValues>({
    course: initialCourse,
    title: '',
    content: '',
  });
  const [errors, setErrors] = useState<LessonFormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const fieldRefs = useRef<Partial<Record<LessonFormField, HTMLElement | null>>>({});

  function updateField(field: LessonFormField, value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    // Errors appear only after the first submit attempt, then follow the user's corrections.
    if (submitted) {
      const result = validateLessonForm(next, teaching);
      setErrors(result.ok ? {} : result.errors);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    const result = validateLessonForm(values, teaching);
    if (!result.ok) {
      setErrors(result.errors);
      const firstInvalid = lessonFormFieldOrder.find((field) => result.errors[field]);
      if (firstInvalid) fieldRefs.current[firstInvalid]?.focus();
      return;
    }
    onSubmit(result.data);
  }

  const setRef = (field: LessonFormField) => (element: HTMLElement | null) => {
    fieldRefs.current[field] = element;
  };

  return (
    // noValidate: we show our own accessible messages instead of browser pop-ups.
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-8">
      <p className="text-sm text-ink-soft">{t.allFieldsRequired}</p>

      <fieldset aria-describedby={errors.course ? 'lesson-course-error' : undefined}>
        <legend className="mb-3 text-base font-medium">{t.courseLabel}</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teaching.map((course, index) => {
            const subject = school.getSubject(course.subjectId);
            const group = school.getClass(course.classId);
            if (!subject || !group) return null;
            const key = courseKey(course);
            return (
              <label
                key={key}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-3xl border-2 border-transparent bg-card p-3 shadow-soft transition-[border-color,transform] duration-200 hover:-translate-y-0.5',
                  'has-[:checked]:border-forest has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-ring',
                )}
              >
                <input
                  ref={index === 0 ? setRef('course') : undefined}
                  type="radio"
                  name="course"
                  value={key}
                  checked={values.course === key}
                  onChange={() => updateField('course', key)}
                  aria-invalid={Boolean(errors.course)}
                  className="sr-only"
                />
                <SubjectBlob subject={subject} />
                <span className="min-w-0">
                  <span className="block font-display font-semibold text-ink">{subject.name}</span>
                  <span className="block text-sm text-ink-soft">
                    {text.home.classHeading(group.name)}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        {errors.course && (
          <p id="lesson-course-error" className="mt-2 text-sm font-medium text-destructive">
            {errors.course}
          </p>
        )}
      </fieldset>

      <FormField id="lesson-title" label={t.titleLabel} error={errors.title} required>
        {(props) => (
          <Input
            {...props}
            ref={setRef('title')}
            name="title"
            value={values.title}
            onChange={(event) => updateField('title', event.target.value)}
            className={controlClassName}
          />
        )}
      </FormField>

      <FormField
        id="lesson-content"
        label={t.contentLabel}
        hint={t.contentHint}
        error={errors.content}
        required
      >
        {(props) => (
          <Textarea
            {...props}
            ref={setRef('content')}
            name="content"
            rows={10}
            value={values.content}
            onChange={(event) => updateField('content', event.target.value)}
            className="min-h-64 rounded-2xl bg-card text-base leading-relaxed md:text-base"
          />
        )}
      </FormField>

      <p className="flex items-start gap-2 text-ink-soft">
        <SparkleIcon
          aria-hidden="true"
          weight="duotone"
          className="mt-0.5 size-5 shrink-0 text-lilac-ink"
        />
        {t.aiNote}
      </p>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" size="lg" onClick={onCancel} className="h-12 px-6">
          {t.cancel}
        </Button>
        <Button type="submit" size="lg" className="h-12 px-6">
          <SparkleIcon aria-hidden="true" weight="fill" />
          {t.save}
        </Button>
      </div>
    </form>
  );
}

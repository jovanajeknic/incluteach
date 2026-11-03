import { useRef, useState, type FormEvent } from 'react';
import { FormField } from '@/shared/components/FormField';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { Textarea } from '@/shared/ui/textarea';
import { text } from '@/text/sr-Latn';
import {
  emptyLessonForm,
  lessonFormFieldOrder,
  validateLessonForm,
  type LessonFormErrors,
  type LessonFormField,
  type LessonFormValues,
} from '../lessonForm';
import type { NewLessonInput } from '@/features/school/schoolContext';
import type { Subject } from '@/features/student/types';
import { GRADES } from '../types';

interface LessonFormProps {
  subjects: readonly Subject[];
  onSubmit: (input: NewLessonInput) => void;
  onCancel: () => void;
}

const controlClassName = 'h-11 bg-card text-base md:text-base';

export function LessonForm({ subjects, onSubmit, onCancel }: LessonFormProps) {
  const t = text.newLesson;
  const [values, setValues] = useState<LessonFormValues>(emptyLessonForm);
  const [errors, setErrors] = useState<LessonFormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const fieldRefs = useRef<Partial<Record<LessonFormField, HTMLElement | null>>>({});
  const subjectIds = subjects.map((subject) => subject.id);

  function updateField(field: LessonFormField, value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    // Errors appear only after the first submit attempt, then follow the user's corrections.
    if (submitted) {
      const result = validateLessonForm(next, subjectIds);
      setErrors(result.ok ? {} : result.errors);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    const result = validateLessonForm(values, subjectIds);
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
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">{t.allFieldsRequired}</p>

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

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField id="lesson-subject" label={t.subjectLabel} error={errors.subjectId} required>
          {(props) => (
            <NativeSelect
              {...props}
              ref={setRef('subjectId')}
              name="subjectId"
              value={values.subjectId}
              onChange={(event) => updateField('subjectId', event.target.value)}
              className={controlClassName}
            >
              <NativeSelectOption value="">{t.subjectPlaceholder}</NativeSelectOption>
              {subjects.map((subject) => (
                <NativeSelectOption key={subject.id} value={subject.id}>
                  {subject.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </FormField>

        <FormField id="lesson-grade" label={t.gradeLabel} error={errors.grade} required>
          {(props) => (
            <NativeSelect
              {...props}
              ref={setRef('grade')}
              name="grade"
              value={values.grade}
              onChange={(event) => updateField('grade', event.target.value)}
              className={controlClassName}
            >
              <NativeSelectOption value="">{t.gradePlaceholder}</NativeSelectOption>
              {GRADES.map((grade) => (
                <NativeSelectOption key={grade} value={String(grade)}>
                  {text.lesson.gradeLabel(grade)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </FormField>
      </div>

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
            className="min-h-60 bg-card text-base leading-relaxed md:text-base"
          />
        )}
      </FormField>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" size="lg" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button type="submit" size="lg">
          {t.save}
        </Button>
      </div>
    </form>
  );
}

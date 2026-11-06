import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { SubmitButton } from '@/features/auth/components/AuthStatus';
import { authFieldClassName } from '@/features/auth/components/fieldStyles';
import { ApiError } from '@/shared/api/apiClient';
import { FormField } from '@/shared/components/FormField';
import { schoolYearLabel } from '@/shared/lib/schoolYear';
import { Input } from '@/shared/ui/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { text } from '@/text/sr-Latn';
import type { SchoolClass } from '../api/classesApi';
import { useCreateSubject } from '../api/queries';
import type { ManagedUser } from '../api/usersApi';
import { adminErrorMessage } from '../apiErrorMessage';
import { adminClassesPath, adminNewUserPath } from '../paths';
import { newSubjectSchema, type NewSubjectInput, type NewSubjectValues } from '../schemas';

const t = text.admin.subjects;

/** Which field an error of the server belongs to; anything else is for the page. */
const fieldOfError = {
  invalid_subject_name: 'name',
  subject_exists: 'name',
  invalid_class: 'classId',
  invalid_teacher: 'teacherId',
} as const;

interface AddSubjectFormProps {
  schoolYear: number;
  /** The odeljenja of the school year that is on the screen. */
  classes: SchoolClass[];
  /** Teachers who are still at the school. */
  teachers: ManagedUser[];
  onAdded: (name: string) => void;
  onProblem: (message: string) => void;
}

/** A new subject: a name in one odeljenje, taught by one teacher. */
export function AddSubjectForm({
  schoolYear,
  classes,
  teachers,
  onAdded,
  onProblem,
}: AddSubjectFormProps) {
  const createSubject = useCreateSubject();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<NewSubjectInput, unknown, NewSubjectValues>({
    resolver: zodResolver(newSubjectSchema),
    defaultValues: { name: '', classId: '', teacherId: '' },
  });

  async function onValid(values: NewSubjectValues) {
    try {
      const answer = await createSubject.mutateAsync(values);
      // The class and the teacher are kept: subjects are usually added one after another.
      reset({ name: '', classId: values.classId, teacherId: values.teacherId });
      onAdded(answer.subject.name);
    } catch (error) {
      const message = adminErrorMessage(error);
      const field =
        error instanceof ApiError
          ? fieldOfError[error.code as keyof typeof fieldOfError]
          : undefined;
      if (field) setError(field, { message });
      else onProblem(message);
    }
  }

  return (
    <section aria-labelledby="add-subject-heading" className="mt-10 max-w-xl">
      <h2 id="add-subject-heading" className="font-display text-2xl font-semibold text-ink">
        {t.addHeading}
      </h2>
      <p className="mt-1 text-ink-soft">{t.addFor(schoolYearLabel(schoolYear))}</p>
      {classes.length === 0 && (
        <p className="mt-3 text-ink">
          {t.needClass}{' '}
          <Link to={adminClassesPath} className="font-semibold underline">
            {t.needClassLink}
          </Link>
        </p>
      )}
      {teachers.length === 0 && (
        <p className="mt-3 text-ink">
          {t.needTeacher}{' '}
          <Link to={adminNewUserPath} className="font-semibold underline">
            {t.needTeacherLink}
          </Link>
        </p>
      )}
      <form noValidate onSubmit={handleSubmit(onValid)} className="mt-4 flex flex-col gap-5">
        <FormField id="new-subject-name" label={t.nameLabel} error={errors.name?.message} required>
          {(props) => (
            <Input
              {...props}
              {...register('name')}
              autoComplete="off"
              className={authFieldClassName}
            />
          )}
        </FormField>
        <FormField
          id="new-subject-class"
          label={t.classLabel}
          error={errors.classId?.message}
          required
        >
          {(props) => (
            <NativeSelect
              {...props}
              {...register('classId')}
              className="h-12 rounded-xl bg-card text-base"
            >
              <NativeSelectOption value="">{t.classPlaceholder}</NativeSelectOption>
              {classes.map((item) => (
                <NativeSelectOption key={item.id} value={item.id}>
                  {item.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField
          id="new-subject-teacher"
          label={t.teacherLabel}
          error={errors.teacherId?.message}
          required
        >
          {(props) => (
            <NativeSelect
              {...props}
              {...register('teacherId')}
              className="h-12 rounded-xl bg-card text-base"
            >
              <NativeSelectOption value="">{t.teacherPlaceholder}</NativeSelectOption>
              {teachers.map((person) => (
                <NativeSelectOption key={person.id} value={person.id}>
                  {person.fullName}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <SubmitButton label={t.add} pendingLabel={t.adding} pending={isSubmitting} />
      </form>
    </section>
  );
}

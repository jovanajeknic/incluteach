import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { SubmitButton } from '@/features/auth/components/AuthStatus';
import { authFieldClassName } from '@/features/auth/components/fieldStyles';
import { ApiError } from '@/shared/api/apiClient';
import { FormField } from '@/shared/components/FormField';
import { schoolYearLabel } from '@/shared/lib/schoolYear';
import { Input } from '@/shared/ui/input';
import { text } from '@/text/sr-Latn';
import { useCreateClass } from '../api/queries';
import { adminErrorMessage } from '../apiErrorMessage';
import { newClassSchema, type NewClassInput, type NewClassValues } from '../schemas';

const t = text.admin.classes;

interface AddClassFormProps {
  schoolYear: number;
  onAdded: (name: string) => void;
  onProblem: (message: string) => void;
}

/** A new odeljenje in the school year that is on the screen. */
export function AddClassForm({ schoolYear, onAdded, onProblem }: AddClassFormProps) {
  const createClass = useCreateClass();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<NewClassInput, unknown, NewClassValues>({
    resolver: zodResolver(newClassSchema),
    defaultValues: { name: '' },
  });

  async function onValid({ name }: NewClassValues) {
    try {
      const answer = await createClass.mutateAsync({ name, schoolYear });
      reset();
      onAdded(answer.class.name);
    } catch (error) {
      const message = adminErrorMessage(error);
      // Problems with the name belong next to the name; anything else is for the page.
      if (
        error instanceof ApiError &&
        (error.code === 'class_exists' || error.code === 'invalid_class_name')
      ) {
        setError('name', { message });
      } else {
        onProblem(message);
      }
    }
  }

  return (
    <section aria-labelledby="add-class-heading" className="mt-10 max-w-xl">
      <h2 id="add-class-heading" className="font-display text-2xl font-semibold text-ink">
        {t.addHeading}
      </h2>
      <p className="mt-1 text-ink-soft">{t.addFor(schoolYearLabel(schoolYear))}</p>
      <form noValidate onSubmit={handleSubmit(onValid)} className="mt-4 flex flex-col gap-5">
        <FormField
          id="new-class-name"
          label={t.nameLabel}
          hint={t.nameHint}
          error={errors.name?.message}
          required
        >
          {(props) => (
            <Input
              {...props}
              {...register('name')}
              autoComplete="off"
              className={authFieldClassName}
            />
          )}
        </FormField>
        <SubmitButton label={t.add} pendingLabel={t.adding} pending={isSubmitting} />
      </form>
    </section>
  );
}

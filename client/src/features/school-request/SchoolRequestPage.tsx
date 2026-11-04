import { zodResolver } from '@hookform/resolvers/zod';
import { InfoIcon, BuildingsIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import {
  SubmitButton,
  SubmitOutcomeMessage,
  type SubmitOutcome,
} from '@/features/auth/components/AuthStatus';
import { authFieldClassName } from '@/features/auth/components/fieldStyles';
import { FormField } from '@/shared/components/FormField';
import { cn } from '@/shared/lib/utils';
import { Input } from '@/shared/ui/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { Textarea } from '@/shared/ui/textarea';
import { blobShape } from '@/shared/visual/subjectIcons';
import { text } from '@/text/sr-Latn';
import {
  SCHOOL_CONTACT_ROLES,
  schoolRequestFieldOrder,
  schoolRequestSchema,
  type SchoolRequestInput,
  type SchoolRequestValues,
} from './schoolRequestSchema';
import { schoolRequestService } from './schoolRequestService';

const emptyForm: SchoolRequestInput = {
  schoolName: '',
  municipality: '',
  contactName: '',
  contactRole: '' as SchoolRequestInput['contactRole'],
  email: '',
  phone: '',
  message: '',
  consent: false as unknown as true,
};

/** A school asks to join IncluTeach. No account is created here. */
export function SchoolRequestPage() {
  const t = text.schoolRequest;
  const [outcome, setOutcome] = useState<SubmitOutcome>(null);
  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<SchoolRequestInput, unknown, SchoolRequestValues>({
    resolver: zodResolver(schoolRequestSchema),
    defaultValues: emptyForm,
    // Focus follows the order on screen, not the order in which errors are reported.
    shouldFocusError: false,
  });

  async function onValid(values: SchoolRequestValues) {
    setOutcome(null);
    try {
      await schoolRequestService.submit(values);
      setOutcome({ kind: 'demo-success', message: t.demoSuccess });
      reset(emptyForm);
    } catch {
      setOutcome({ kind: 'error' });
    }
  }

  return (
    <AuthLayout>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <div>
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className={cn(
              'flex size-14 shrink-0 items-center justify-center bg-butter text-butter-ink',
              blobShape,
            )}
          >
            <BuildingsIcon weight="duotone" className="size-8" />
          </span>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">
            {t.heading}
          </h1>
        </div>
        <p className="mt-3 text-ink-soft">{t.description}</p>

        <p
          role="note"
          className="mt-5 flex items-start gap-2 rounded-2xl bg-lilac px-4 py-3 text-sm font-medium text-lilac-ink"
        >
          <InfoIcon aria-hidden="true" weight="duotone" className="mt-0.5 size-5 shrink-0" />
          {t.demoNotice}
        </p>

        <section aria-label={t.stepsLabel} className="mt-5">
          <ol className="grid gap-2">
            {t.steps.map((step, index) => (
              <li key={step} className="flex items-center gap-3 text-ink">
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center bg-mint font-display text-sm font-semibold text-mint-ink',
                    blobShape,
                  )}
                >
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <form
          noValidate
          onSubmit={handleSubmit(onValid, (problems) => {
            setOutcome(null);
            const first = schoolRequestFieldOrder.find((field) => problems[field]);
            if (first) setFocus(first);
          })}
          className="mt-8 flex flex-col gap-5"
        >
          <FormField
            id="school-name"
            label={t.fields.schoolName}
            error={errors.schoolName?.message}
            required
          >
            {(props) => (
              <Input
                {...props}
                {...register('schoolName')}
                autoComplete="organization"
                className={authFieldClassName}
              />
            )}
          </FormField>

          <FormField
            id="school-municipality"
            label={t.fields.municipality}
            error={errors.municipality?.message}
            required
          >
            {(props) => (
              <Input
                {...props}
                {...register('municipality')}
                autoComplete="address-level2"
                className={authFieldClassName}
              />
            )}
          </FormField>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              id="school-contact-name"
              label={t.fields.contactName}
              error={errors.contactName?.message}
              required
            >
              {(props) => (
                <Input
                  {...props}
                  {...register('contactName')}
                  autoComplete="name"
                  className={authFieldClassName}
                />
              )}
            </FormField>

            <FormField
              id="school-contact-role"
              label={t.fields.contactRole}
              error={errors.contactRole?.message}
              required
            >
              {(props) => (
                <NativeSelect
                  {...props}
                  {...register('contactRole')}
                  className={authFieldClassName}
                >
                  <NativeSelectOption value="">
                    {t.fields.contactRolePlaceholder}
                  </NativeSelectOption>
                  {SCHOOL_CONTACT_ROLES.map((role) => (
                    <NativeSelectOption key={role} value={role}>
                      {t.fields.roles[role]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              )}
            </FormField>
          </div>

          <FormField
            id="school-email"
            label={t.fields.email}
            hint={t.fields.emailHint}
            error={errors.email?.message}
            required
          >
            {(props) => (
              <Input
                {...props}
                {...register('email')}
                type="email"
                inputMode="email"
                autoComplete="email"
                className={authFieldClassName}
              />
            )}
          </FormField>

          <FormField id="school-phone" label={t.fields.phone} error={errors.phone?.message}>
            {(props) => (
              <Input
                {...props}
                {...register('phone')}
                type="tel"
                autoComplete="tel"
                className={authFieldClassName}
              />
            )}
          </FormField>

          <FormField id="school-message" label={t.fields.message} error={errors.message?.message}>
            {(props) => (
              <Textarea
                {...props}
                {...register('message')}
                rows={3}
                className="rounded-2xl bg-paper text-base md:text-base"
              />
            )}
          </FormField>

          <div>
            <label className="flex items-start gap-3 text-ink">
              <input
                type="checkbox"
                {...register('consent')}
                aria-invalid={Boolean(errors.consent)}
                aria-describedby={errors.consent ? 'school-consent-error' : undefined}
                className="mt-1 size-5 shrink-0 accent-forest"
              />
              {t.fields.consent}
            </label>
            {errors.consent && (
              <p id="school-consent-error" className="mt-1 text-sm font-medium text-destructive">
                {errors.consent.message}
              </p>
            )}
          </div>

          <SubmitButton label={t.submit} pendingLabel={t.submitting} pending={isSubmitting} />
          <SubmitOutcomeMessage outcome={outcome} />
        </form>

        <p className="mt-6 text-center">
          <Link
            to="/"
            className="rounded-sm font-display font-medium text-forest underline underline-offset-4"
          >
            {t.backHome}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

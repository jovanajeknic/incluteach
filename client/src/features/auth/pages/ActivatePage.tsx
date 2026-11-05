import { zodResolver } from '@hookform/resolvers/zod';
import { EnvelopeOpenIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useSearchParams } from 'react-router';
import { ApiError } from '@/shared/api/apiClient';
import { FormField } from '@/shared/components/FormField';
import { cn } from '@/shared/lib/utils';
import { Input } from '@/shared/ui/input';
import { blobShape } from '@/shared/visual/subjectIcons';
import { text } from '@/text/sr-Latn';
import { useActivate, useSession } from '../api/session';
import { authErrorMessage } from '../apiErrorMessage';
import { AuthCard, AuthFooterLink } from '../components/AuthCard';
import { AuthLayout } from '../components/AuthLayout';
import { SubmitButton, SubmitOutcomeMessage, type SubmitOutcome } from '../components/AuthStatus';
import { authFieldClassName } from '../components/fieldStyles';
import { PasswordField } from '../components/PasswordField';
import { homePathForRole, loginPath } from '../paths';
import {
  activateSchema,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  type ActivateFormInput,
  type ActivateFormValues,
} from '../schemas';

/**
 * Nobody registers: the school admin gives each person a one-time link (often as a QR code).
 * Opening it, the person chooses a password and adds an email, and is signed in at once.
 */
export function ActivatePage() {
  const t = text.auth;
  const page = t.activate;
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { user } = useSession();
  const activate = useActivate();
  const [outcome, setOutcome] = useState<SubmitOutcome>(null);
  const {
    register,
    handleSubmit,
    resetField,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ActivateFormInput, unknown, ActivateFormValues>({
    resolver: zodResolver(activateSchema),
    defaultValues: { password: '', confirmPassword: '', email: '' },
  });

  // Success sets the session, and this sends the person to their own home page.
  if (user) return <Navigate to={homePathForRole(user.role)} replace />;

  async function onValid(values: ActivateFormValues) {
    setOutcome(null);
    try {
      await activate.mutateAsync({ token, password: values.password, email: values.email });
    } catch (error) {
      const code = error instanceof ApiError ? error.code : '';
      // The server is the source of truth: show a rule it rejects next to its own field.
      if (code === 'email_taken') {
        setError('email', { message: t.errors.emailTaken }, { shouldFocus: true });
      } else if (code === 'invalid_email') {
        setError('email', { message: t.errors.emailInvalid }, { shouldFocus: true });
      } else if (code === 'password_too_short') {
        setError(
          'password',
          { message: t.errors.passwordTooShort(PASSWORD_MIN_LENGTH) },
          { shouldFocus: true },
        );
      } else if (code === 'password_too_long') {
        setError(
          'password',
          { message: t.errors.passwordTooLong(PASSWORD_MAX_LENGTH) },
          { shouldFocus: true },
        );
      } else {
        setOutcome({ kind: 'error', message: authErrorMessage(error) });
      }
      // The password is not kept in memory longer than needed.
      resetField('password', { keepError: true });
      resetField('confirmPassword', { keepError: true });
    }
  }

  return (
    <AuthLayout>
      <title>{text.app.pageTitle(page.pageTitle)}</title>
      <AuthCard
        title={page.heading}
        footer={
          <>
            <AuthFooterLink prompt={page.switchPrompt}>
              <Link to={loginPath}>{page.switchLink}</Link>
            </AuthFooterLink>
            <p className="text-sm">{page.noInvite}</p>
          </>
        }
      >
        <div className="mb-6 flex items-center gap-4 rounded-3xl bg-butter p-4">
          <span
            aria-hidden="true"
            className={cn(
              'flex size-14 shrink-0 items-center justify-center bg-card text-butter-ink',
              blobShape,
            )}
          >
            <EnvelopeOpenIcon weight="duotone" className="size-8" />
          </span>
          <p className="text-ink">{token ? page.description : page.noToken}</p>
        </div>

        {token && (
          <form
            noValidate
            onSubmit={handleSubmit(onValid, () => setOutcome(null))}
            className="flex flex-col gap-5"
          >
            <FormField
              id="activate-password"
              label={t.fields.newPassword}
              hint={t.fields.passwordHint(PASSWORD_MIN_LENGTH)}
              error={errors.password?.message}
              required
            >
              {(props) => (
                <PasswordField
                  {...props}
                  {...register('password')}
                  autoComplete="new-password"
                  className={authFieldClassName}
                />
              )}
            </FormField>

            <FormField
              id="activate-confirm-password"
              label={t.fields.confirmPassword}
              error={errors.confirmPassword?.message}
              required
            >
              {(props) => (
                <PasswordField
                  {...props}
                  {...register('confirmPassword')}
                  autoComplete="new-password"
                  className={authFieldClassName}
                />
              )}
            </FormField>

            <FormField
              id="activate-email"
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

            <SubmitButton
              label={page.submit}
              pendingLabel={page.submitting}
              pending={isSubmitting}
            />
            <SubmitOutcomeMessage outcome={outcome} />
          </form>
        )}
      </AuthCard>
    </AuthLayout>
  );
}

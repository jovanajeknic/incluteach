import { zodResolver } from '@hookform/resolvers/zod';
import { EnvelopeOpenIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import { FormField } from '@/shared/components/FormField';
import { cn } from '@/shared/lib/utils';
import { Input } from '@/shared/ui/input';
import { blobShape } from '@/shared/visual/subjectIcons';
import { text } from '@/text/sr-Latn';
import { authService } from '../api/authService';
import { AuthCard, AuthFooterLink } from '../components/AuthCard';
import { AuthLayout } from '../components/AuthLayout';
import { SubmitButton, SubmitOutcomeMessage, type SubmitOutcome } from '../components/AuthStatus';
import { authFieldClassName } from '../components/fieldStyles';
import { PasswordField } from '../components/PasswordField';
import { loginPath } from '../paths';
import {
  activateSchema,
  PASSWORD_MIN_LENGTH,
  type ActivateFormInput,
  type ActivateFormValues,
} from '../schemas';

/**
 * Teachers and parents do not register: the school opens their account and sends an
 * invitation. Here they confirm it with the invitation code and choose a password.
 */
export function ActivatePage() {
  const t = text.auth;
  const page = t.activate;
  const [params] = useSearchParams();
  const [outcome, setOutcome] = useState<SubmitOutcome>(null);
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<ActivateFormInput, unknown, ActivateFormValues>({
    resolver: zodResolver(activateSchema),
    // The invitation link may carry the code, so the person only chooses a password.
    defaultValues: { inviteCode: params.get('code') ?? '', password: '', confirmPassword: '' },
  });

  async function onValid(values: ActivateFormValues) {
    setOutcome(null);
    try {
      await authService.activate({ inviteCode: values.inviteCode, password: values.password });
      setOutcome({ kind: 'demo-success', message: page.demoSuccess });
      resetField('password');
      resetField('confirmPassword');
    } catch {
      setOutcome({ kind: 'error' });
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
          <p className="text-ink">{page.description}</p>
        </div>

        <form
          noValidate
          onSubmit={handleSubmit(onValid, () => setOutcome(null))}
          className="flex flex-col gap-5"
        >
          <FormField
            id="activate-code"
            label={t.fields.inviteCode}
            hint={t.fields.inviteCodeHint}
            error={errors.inviteCode?.message}
            required
          >
            {(props) => (
              <Input
                {...props}
                {...register('inviteCode')}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className={cn(authFieldClassName, 'font-display tracking-[0.15em]')}
              />
            )}
          </FormField>

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

          <SubmitButton label={page.submit} pendingLabel={page.submitting} pending={isSubmitting} />
          <SubmitOutcomeMessage outcome={outcome} />
        </form>
      </AuthCard>
    </AuthLayout>
  );
}

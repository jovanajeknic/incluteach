import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FormField } from '@/shared/components/FormField';
import { Input } from '@/shared/ui/input';
import { text } from '@/text/sr-Latn';
import { authService } from '../api/authService';
import { AuthCard } from '../components/AuthCard';
import { AuthLayout } from '../components/AuthLayout';
import { SubmitButton, SubmitOutcomeMessage, type SubmitOutcome } from '../components/AuthStatus';
import { authFieldClassName } from '../components/fieldStyles';
import { PasswordField } from '../components/PasswordField';
import { RoleOptions } from '../components/RoleOptions';
import { loginPath } from '../paths';
import {
  PASSWORD_MIN_LENGTH,
  registerSchema,
  type RegisterFormInput,
  type RegisterFormValues,
} from '../schemas';

export function RegisterPage() {
  const t = text.auth;
  const page = t.register;
  const [outcome, setOutcome] = useState<SubmitOutcome>(null);
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInput, unknown, RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', confirmPassword: '' },
  });

  async function onValid(values: RegisterFormValues) {
    setOutcome(null);
    try {
      // The confirmation stays in the form; the role is only a request, and a real backend
      // must decide what the account may do.
      const { role, firstName, lastName, email, password } = values;
      await authService.register({ role, firstName, lastName, email, password });
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
        description={page.description}
        switchPrompt={page.switchPrompt}
        switchLink={page.switchLink}
        switchTo={loginPath}
      >
        <form
          noValidate
          onSubmit={handleSubmit(onValid, () => setOutcome(null))}
          className="flex flex-col gap-5"
        >
          <RoleOptions registration={register('role')} error={errors.role?.message} />

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              id="register-first-name"
              label={t.fields.firstName}
              error={errors.firstName?.message}
              required
            >
              {(props) => (
                <Input
                  {...props}
                  {...register('firstName')}
                  autoComplete="given-name"
                  className={authFieldClassName}
                />
              )}
            </FormField>
            <FormField
              id="register-last-name"
              label={t.fields.lastName}
              error={errors.lastName?.message}
              required
            >
              {(props) => (
                <Input
                  {...props}
                  {...register('lastName')}
                  autoComplete="family-name"
                  className={authFieldClassName}
                />
              )}
            </FormField>
          </div>

          <FormField
            id="register-email"
            label={t.fields.email}
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

          <FormField
            id="register-password"
            label={t.fields.password}
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
            id="register-confirm-password"
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

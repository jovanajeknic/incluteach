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
import { registerPath } from '../paths';
import { loginSchema, type LoginFormInput, type LoginFormValues } from '../schemas';

export function LoginPage() {
  const t = text.auth;
  const page = t.login;
  const [outcome, setOutcome] = useState<SubmitOutcome>(null);
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInput, unknown, LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onValid(values: LoginFormValues) {
    setOutcome(null);
    try {
      await authService.login(values);
      setOutcome({ kind: 'demo-success', message: page.demoSuccess });
      // The password is not kept in memory longer than needed.
      resetField('password');
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
        switchTo={registerPath}
      >
        {/* noValidate: our own accessible messages replace the browser's pop-ups. */}
        <form
          noValidate
          onSubmit={handleSubmit(onValid, () => setOutcome(null))}
          className="flex flex-col gap-5"
        >
          <FormField id="login-email" label={t.fields.email} error={errors.email?.message} required>
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
            id="login-password"
            label={t.fields.password}
            error={errors.password?.message}
            required
          >
            {(props) => (
              <PasswordField
                {...props}
                {...register('password')}
                autoComplete="current-password"
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

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate } from 'react-router';
import { FormField } from '@/shared/components/FormField';
import { Input } from '@/shared/ui/input';
import { text } from '@/text/sr-Latn';
import { useLogin, useSession } from '../api/session';
import { authErrorMessage } from '../apiErrorMessage';
import { AuthCard } from '../components/AuthCard';
import { AuthLayout } from '../components/AuthLayout';
import { SubmitButton, SubmitOutcomeMessage, type SubmitOutcome } from '../components/AuthStatus';
import { authFieldClassName } from '../components/fieldStyles';
import { PasswordField } from '../components/PasswordField';
import { homePathForRole } from '../paths';
import { loginSchema, type LoginFormInput, type LoginFormValues } from '../schemas';

/**
 * Sign-in for everyone the school has given an account, students included: an email or a
 * username and a password. Nobody registers; the school admin hands out an activation link.
 */
export function LoginPage() {
  const t = text.auth;
  const page = t.login;
  const { user } = useSession();
  const login = useLogin();
  const [outcome, setOutcome] = useState<SubmitOutcome>(null);
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInput, unknown, LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  // Someone who is already signed in has nothing to do here. Signing in successfully ends
  // up here too: the session is set, and this sends the person to their own home page.
  if (user) return <Navigate to={homePathForRole(user.role)} replace />;

  async function onValid(values: LoginFormValues) {
    setOutcome(null);
    try {
      await login.mutateAsync(values);
    } catch (error) {
      // The same message for every `invalid_credentials`, so it does not tell which part was wrong.
      setOutcome({ kind: 'error', message: authErrorMessage(error) });
      // The password is not kept in memory longer than needed.
      resetField('password');
    }
  }

  return (
    <AuthLayout>
      <title>{text.app.pageTitle(page.pageTitle)}</title>
      <AuthCard
        title={page.heading}
        description={page.intro}
        footer={
          <>
            <p>{page.activateHint}</p>
            <p className="text-sm">{page.forgotPassword}</p>
          </>
        }
      >
        {/* noValidate: our own accessible messages replace the browser's pop-ups. */}
        <form
          noValidate
          onSubmit={handleSubmit(onValid, () => setOutcome(null))}
          className="flex flex-col gap-5"
        >
          <FormField
            id="login-identifier"
            label={t.fields.identifier}
            hint={t.fields.identifierHint}
            error={errors.identifier?.message}
            required
          >
            {(props) => (
              <Input
                {...props}
                {...register('identifier')}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
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

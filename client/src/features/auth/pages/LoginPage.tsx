import { zodResolver } from '@hookform/resolvers/zod';
import { IdentificationCardIcon, QrCodeIcon, UserIcon } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { Tabs } from 'radix-ui';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
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
import { activatePath } from '../paths';
import {
  loginSchema,
  studentLoginSchema,
  type LoginFormInput,
  type LoginFormValues,
  type StudentLoginFormInput,
  type StudentLoginFormValues,
} from '../schemas';

type Who = 'adult' | 'student';

/**
 * Sign-in for everyone the school has given an account: teachers and parents with email
 * and password, students with the QR card their teacher printed.
 */
export function LoginPage() {
  const page = text.auth.login;
  const [who, setWho] = useState<Who>('adult');

  return (
    <AuthLayout>
      <title>{text.app.pageTitle(page.pageTitle)}</title>
      <AuthCard
        title={page.heading}
        footer={
          who === 'adult' ? (
            <AuthFooterLink prompt={page.invitePrompt}>
              <Link to={activatePath}>{page.inviteLink}</Link>
            </AuthFooterLink>
          ) : (
            <p>{page.lostCard}</p>
          )
        }
      >
        <Tabs.Root value={who} onValueChange={(value) => setWho(value as Who)}>
          <Tabs.List
            aria-label={page.tabsLabel}
            className="grid grid-cols-2 gap-1 rounded-3xl bg-paper p-1"
          >
            <WhoTab value="adult" active={who === 'adult'} icon={UserIcon}>
              {page.adultTab}
            </WhoTab>
            <WhoTab value="student" active={who === 'student'} icon={IdentificationCardIcon}>
              {page.studentTab}
            </WhoTab>
          </Tabs.List>
          <Tabs.Content value="adult" className="mt-6 focus-visible:outline-none">
            <AdultForm />
          </Tabs.Content>
          <Tabs.Content value="student" className="mt-6 focus-visible:outline-none">
            <StudentForm />
          </Tabs.Content>
        </Tabs.Root>
      </AuthCard>
    </AuthLayout>
  );
}

function WhoTab({
  value,
  active,
  icon: TabIcon,
  children,
}: {
  value: Who;
  active: boolean;
  icon: typeof UserIcon;
  children: string;
}) {
  return (
    <Tabs.Trigger
      value={value}
      className={cn(
        'relative flex items-center justify-center gap-2 rounded-[1.25rem] px-3 py-2.5 font-display text-sm font-medium transition-colors sm:text-base',
        active ? 'text-ink' : 'text-ink-soft hover:text-ink',
      )}
    >
      {active && (
        <motion.span
          layoutId="auth-who-marker"
          aria-hidden="true"
          className="absolute inset-0 rounded-[1.25rem] bg-card shadow-soft"
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        />
      )}
      <TabIcon aria-hidden="true" weight="duotone" className="relative size-5" />
      <span className="relative">{children}</span>
    </Tabs.Trigger>
  );
}

function AdultForm() {
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
    // noValidate: our own accessible messages replace the browser's pop-ups.
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
  );
}

function StudentForm() {
  const t = text.auth;
  const page = t.login;
  const [outcome, setOutcome] = useState<SubmitOutcome>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudentLoginFormInput, unknown, StudentLoginFormValues>({
    resolver: zodResolver(studentLoginSchema),
    defaultValues: { cardCode: '' },
  });

  async function onValid(values: StudentLoginFormValues) {
    setOutcome(null);
    try {
      await authService.loginWithCard(values);
      setOutcome({ kind: 'demo-success', message: page.studentDemoSuccess });
    } catch {
      setOutcome({ kind: 'error' });
    }
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onValid, () => setOutcome(null))}
      className="flex flex-col gap-5"
    >
      <div className="flex items-center gap-4 rounded-3xl bg-sky p-4">
        <span
          aria-hidden="true"
          className={cn(
            'flex size-14 shrink-0 items-center justify-center bg-card text-sky-ink',
            blobShape,
          )}
        >
          <QrCodeIcon weight="duotone" className="size-8" />
        </span>
        <p className="text-ink">
          {page.studentIntro}
          <span className="mt-1 block text-sm text-ink-soft">{page.studentScanNote}</span>
        </p>
      </div>

      <FormField
        id="login-card-code"
        label={t.fields.cardCode}
        hint={t.fields.cardCodeHint}
        error={errors.cardCode?.message}
        required
      >
        {(props) => (
          <Input
            {...props}
            {...register('cardCode')}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className={cn(authFieldClassName, 'font-display text-lg tracking-[0.2em] md:text-lg')}
          />
        )}
      </FormField>

      <SubmitButton label={page.submit} pendingLabel={page.submitting} pending={isSubmitting} />
      <SubmitOutcomeMessage outcome={outcome} />
    </form>
  );
}

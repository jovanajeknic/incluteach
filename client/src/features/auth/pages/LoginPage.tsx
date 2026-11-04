import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowRightIcon,
  ChalkboardTeacherIcon,
  QrCodeIcon,
  StudentIcon,
  UsersThreeIcon,
  type UserIcon,
} from '@phosphor-icons/react';
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
import { teacherHomePath } from '@/features/lessons/paths';
import { parentHomePath } from '@/features/parent/paths';
import { studentHomePath } from '@/features/student/paths';
import { activatePath } from '../paths';
import {
  loginSchema,
  studentLoginSchema,
  type LoginFormInput,
  type LoginFormValues,
  type StudentLoginFormInput,
  type StudentLoginFormValues,
} from '../schemas';

type Role = 'teacher' | 'parent' | 'student';

const roles: { value: Role; icon: typeof UserIcon; tone: string }[] = [
  { value: 'teacher', icon: ChalkboardTeacherIcon, tone: 'bg-butter text-butter-ink' },
  { value: 'parent', icon: UsersThreeIcon, tone: 'bg-blush text-blush-ink' },
  { value: 'student', icon: StudentIcon, tone: 'bg-sky text-sky-ink' },
];

const demoPaths: Record<Role, string> = {
  teacher: teacherHomePath,
  parent: parentHomePath,
  student: studentHomePath,
};

/**
 * Sign-in for everyone the school has given an account. Teachers and parents use email and
 * password, students the QR card their teacher printed. Choosing the role first tells the
 * real backend where to send the person; in the demo it opens that role's demo.
 */
export function LoginPage() {
  const page = text.auth.login;
  const [role, setRole] = useState<Role>('teacher');

  return (
    <AuthLayout>
      <title>{text.app.pageTitle(page.pageTitle)}</title>
      <AuthCard
        title={page.heading}
        footer={
          role === 'student' ? (
            <p>{page.lostCard}</p>
          ) : (
            <AuthFooterLink prompt={page.invitePrompt}>
              <Link to={activatePath}>{page.inviteLink}</Link>
            </AuthFooterLink>
          )
        }
      >
        <Tabs.Root value={role} onValueChange={(value) => setRole(value as Role)}>
          <Tabs.List aria-label={page.rolesLabel} className="grid grid-cols-3 gap-3">
            {roles.map(({ value, icon: RoleIcon, tone }) => (
              <Tabs.Trigger
                key={value}
                value={value}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-2xl border-2 px-2 py-4 font-display font-medium text-ink transition-colors',
                  role === value
                    ? 'border-forest bg-card'
                    : 'border-border bg-paper text-ink-soft hover:border-forest/40 hover:text-ink',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn('flex size-11 items-center justify-center', blobShape, tone)}
                >
                  <RoleIcon weight="duotone" className="size-6" />
                </span>
                {page.roles[value]}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {roles.map(({ value }) => (
            <Tabs.Content key={value} value={value} className="mt-8 focus-visible:outline-none">
              <p className="mb-6 text-ink-soft">{page.roleIntro[value]}</p>
              {value === 'student' ? <StudentForm /> : <AdultForm role={value} />}
            </Tabs.Content>
          ))}
        </Tabs.Root>
      </AuthCard>
    </AuthLayout>
  );
}

/** After the demo check, a way into the demo of the chosen role. */
function OpenDemoLink({ role }: { role: Role }) {
  return (
    <Link
      to={demoPaths[role]}
      className="mt-3 inline-flex items-center gap-1.5 font-display font-medium text-forest underline underline-offset-4"
    >
      {text.auth.login.openDemo[role]}
      <ArrowRightIcon aria-hidden="true" weight="bold" className="size-4" />
    </Link>
  );
}

function AdultForm({ role }: { role: 'teacher' | 'parent' }) {
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
      <FormField
        id={`login-email-${role}`}
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
        id={`login-password-${role}`}
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
      {outcome?.kind === 'demo-success' && <OpenDemoLink role={role} />}
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
      <p className="flex items-center gap-2 rounded-xl bg-sky/60 px-4 py-3 text-sm text-ink">
        <QrCodeIcon aria-hidden="true" weight="duotone" className="size-5 shrink-0 text-sky-ink" />
        {page.studentScanNote}
      </p>

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
      {outcome?.kind === 'demo-success' && <OpenDemoLink role="student" />}
    </form>
  );
}

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { SubmitButton } from '@/features/auth/components/AuthStatus';
import { authFieldClassName } from '@/features/auth/components/fieldStyles';
import { FormField } from '@/shared/components/FormField';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { text } from '@/text/sr-Latn';
import { useCreateUser, useIssueActivation } from '../api/queries';
import type { Activation, ManagedUser, NewUserRole } from '../api/usersApi';
import { adminErrorMessage } from '../apiErrorMessage';
import { ActivationLink } from '../components/ActivationLink';
import { adminUsersPath } from '../paths';
import { newUserSchema, type NewUserInput, type NewUserValues } from '../schemas';

const t = text.admin.newUser;
const roles: readonly NewUserRole[] = ['teacher', 'student', 'parent'];

/** What the page shows once the account exists: the person, and their link if it was made. */
interface Created {
  user: ManagedUser;
  activation: Activation | null;
}

/**
 * "Novi nalog": makes the account and, in the same step, the link the person opens to choose a
 * password. The system sends nothing itself; the administrator hands the link over.
 */
export function NewUserPage() {
  const createUser = useCreateUser();
  const issue = useIssueActivation();
  const [created, setCreated] = useState<Created | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewUserInput, unknown, NewUserValues>({
    resolver: zodResolver(newUserSchema),
    defaultValues: { fullName: '', role: '' as NewUserValues['role'] },
  });

  async function onValid(values: NewUserValues) {
    setProblem(null);
    let user: ManagedUser;
    try {
      user = (await createUser.mutateAsync(values)).user;
    } catch (error) {
      setProblem(adminErrorMessage(error));
      return;
    }
    // A failed link must not hide that the account exists: the person can ask for it again.
    setCreated({ user, activation: await requestLink(user.id) });
  }

  /** The link, or `null` with the reason shown, so a second click can try again. */
  async function requestLink(userId: string): Promise<Activation | null> {
    try {
      return (await issue.mutateAsync(userId)).activation;
    } catch (error) {
      setProblem(`${t.linkFailed} ${adminErrorMessage(error)}`);
      return null;
    }
  }

  async function retryLink(user: ManagedUser) {
    setProblem(null);
    setCreated({ user, activation: await requestLink(user.id) });
  }

  function another() {
    setCreated(null);
    setProblem(null);
    reset();
  }

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">{t.heading}</h1>

      {problem && (
        <p
          role="alert"
          className="mt-4 max-w-2xl rounded-2xl bg-blush px-4 py-3 font-medium text-blush-ink"
        >
          {problem}
        </p>
      )}

      {created ? (
        <section aria-labelledby="created-heading" className="mt-6 max-w-3xl">
          <div className="rounded-2xl bg-mint px-5 py-4 text-mint-ink">
            <h2 id="created-heading" className="font-display text-xl font-semibold">
              {t.created(created.user.fullName)}
            </h2>
            <p className="mt-1 font-medium">{t.usernameIs(created.user.username)}</p>
          </div>
          <div className="mt-6 rounded-2xl bg-card px-5 py-5 shadow-sm">
            <h2 className="mb-4 font-display text-xl font-semibold text-ink">
              {text.admin.link.heading}
            </h2>
            {created.activation ? (
              <ActivationLink activation={created.activation} person={created.user} />
            ) : (
              <Button
                type="button"
                size="lg"
                disabled={issue.isPending}
                onClick={() => void retryLink(created.user)}
              >
                {issue.isPending ? text.admin.users.issuing : t.makeLink}
              </Button>
            )}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" size="lg" onClick={another}>
              {t.another}
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to={adminUsersPath}>{t.toList}</Link>
            </Button>
          </div>
        </section>
      ) : (
        <>
          <p className="mt-2 max-w-2xl text-ink-soft">{t.intro}</p>
          <form
            noValidate
            onSubmit={handleSubmit(onValid, () => setProblem(null))}
            className="mt-6 flex max-w-xl flex-col gap-5"
          >
            <FormField
              id="new-user-name"
              label={t.fullNameLabel}
              error={errors.fullName?.message}
              required
            >
              {(props) => (
                <Input
                  {...props}
                  {...register('fullName')}
                  autoComplete="off"
                  className={authFieldClassName}
                />
              )}
            </FormField>
            <FormField id="new-user-role" label={t.roleLabel} error={errors.role?.message} required>
              {(props) => (
                <NativeSelect
                  {...props}
                  {...register('role')}
                  className="h-12 rounded-xl bg-card text-base"
                >
                  <NativeSelectOption value="">{t.rolePlaceholder}</NativeSelectOption>
                  {roles.map((role) => (
                    <NativeSelectOption key={role} value={role}>
                      {text.admin.roles[role]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            <SubmitButton label={t.submit} pendingLabel={t.submitting} pending={isSubmitting} />
          </form>
        </>
      )}
    </>
  );
}

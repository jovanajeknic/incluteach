import { useNavigate } from 'react-router';
import { useLogout, useSession } from '@/features/auth/api/session';
import { loginPath } from '@/features/auth/paths';
import { MessagePage } from '@/shared/components/MessagePage';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';

/**
 * Placeholder until the admin screens (users, odeljenja, subjects, families) are built.
 * It exists so an administrator who signs in lands somewhere and can sign out.
 */
export function AdminHomePage() {
  const t = text.admin;
  const { user } = useSession();
  const logout = useLogout();
  const navigate = useNavigate();

  return (
    <main className="px-4">
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <MessagePage
        title={t.heading}
        description={`${user ? t.signedInAs(user.fullName) + ' ' : ''}${t.description}`}
        action={
          <div className="flex flex-col items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={logout.isPending}
              onClick={() =>
                logout.mutate(undefined, { onSuccess: () => void navigate(loginPath) })
              }
            >
              {text.nav.signOut}
            </Button>
            {logout.isError && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {text.session.signOutFailed}
              </p>
            )}
          </div>
        }
      />
    </main>
  );
}

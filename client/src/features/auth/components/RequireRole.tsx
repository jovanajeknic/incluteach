import { Link, Navigate, Outlet } from 'react-router';
import { LoadingState } from '@/shared/components/LoadingState';
import { MessagePage } from '@/shared/components/MessagePage';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import type { Role } from '../api/authApi';
import { useSession } from '../api/session';
import { homePathForRole, loginPath } from '../paths';

/**
 * Route guard for one role's area. It only steers navigation: no session goes to sign-in,
 * another role sees the "no access" page. The backend decides what each person may really
 * read and change (AGENTS.md, section 8).
 */
export function RequireRole({ role }: { role: Role }) {
  const t = text.session;
  const { user, isLoading, isError, retry } = useSession();

  if (isLoading) return <LoadingState label={t.loading} />;

  if (isError) {
    // The server could not be reached, which is not the same as "not signed in".
    return (
      <MessagePage
        title={t.unavailableTitle}
        description={t.unavailableDescription}
        action={
          <Button type="button" variant="outline" size="lg" onClick={retry}>
            {t.retry}
          </Button>
        }
      />
    );
  }

  if (!user) return <Navigate to={loginPath} replace />;

  if (user.role !== role) {
    return (
      <MessagePage
        title={t.forbiddenTitle}
        description={t.forbiddenDescription}
        action={
          <Button asChild variant="outline" size="lg">
            <Link to={homePathForRole(user.role)}>{t.forbiddenAction}</Link>
          </Button>
        }
      />
    );
  }

  return <Outlet />;
}

import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { MessagePage } from '@/shared/components/MessagePage';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { useChild } from '../api/queries';
import type { Child } from '../api/parentApi';
import { parentHomePath } from '../paths';

/**
 * Shows a page about one child only when the child is one of the parent's. Any other id gives
 * the same "no access" page, whether or not that child exists, so nothing is revealed about
 * other families. The server refuses the calls about someone else's child as well.
 */
export function ChildGate({
  childId,
  children,
}: {
  childId: string;
  children: (child: Child) => ReactNode;
}) {
  const t = text.guardian.child;
  const { status, child, retry } = useChild(childId);

  if (status === 'loading') return <LoadingState label={text.pupil.load.loading} />;
  if (status === 'error') return <ErrorState onRetry={retry} />;
  if (status === 'forbidden' || !child) {
    return (
      <>
        <title>{text.app.pageTitle(t.forbiddenTitle)}</title>
        <MessagePage
          title={t.forbiddenTitle}
          description={t.forbiddenDescription}
          action={
            <Button asChild variant="outline" size="lg">
              <Link to={parentHomePath}>{t.back}</Link>
            </Button>
          }
        />
      </>
    );
  }
  return <>{children(child)}</>;
}

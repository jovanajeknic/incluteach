import { Link } from 'react-router';
import { MessagePage } from '@/shared/components/MessagePage';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { parentHomePath } from '../paths';

/**
 * Shown for any child that is not linked to this parent. The same message is used whether
 * or not the child exists, so the page reveals nothing about other families.
 */
export function ForbiddenChild() {
  const t = text.parent.child;
  return (
    <>
      <title>{text.app.pageTitle(t.forbiddenTitle)}</title>
      <MessagePage
        title={t.forbiddenTitle}
        description={t.forbiddenDescription}
        action={
          <Button asChild variant="outline" size="lg">
            <Link to={parentHomePath}>{t.backToChildren}</Link>
          </Button>
        }
      />
    </>
  );
}

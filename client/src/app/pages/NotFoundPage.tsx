import { Link } from 'react-router';
import { teacherHomePath } from '@/features/lessons/paths';
import { MessagePage } from '@/shared/components/MessagePage';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';

export function NotFoundPage() {
  const t = text.notFound;
  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <MessagePage
        title={t.heading}
        description={t.description}
        action={
          <Button asChild variant="outline" size="lg">
            <Link to={teacherHomePath}>{t.backHome}</Link>
          </Button>
        }
      />
    </>
  );
}

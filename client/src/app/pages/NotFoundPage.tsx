import { Link } from 'react-router';
import { MessagePage } from '@/shared/components/MessagePage';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';

interface NotFoundPageProps {
  /** Where "back home" leads: the public home page or the teacher home page. */
  homePath: string;
}

export function NotFoundPage({ homePath }: NotFoundPageProps) {
  const t = text.notFound;
  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <MessagePage
        title={t.heading}
        description={t.description}
        action={
          <Button asChild variant="outline" size="lg">
            <Link to={homePath}>{t.backHome}</Link>
          </Button>
        }
      />
    </>
  );
}

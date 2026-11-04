import { MessagePage } from '@/shared/components/MessagePage';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';

/** Shown instead of a blank screen when a route throws an unexpected error. */
export function RouteErrorPage() {
  const t = text.routeError;
  return (
    <main className="px-4">
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <MessagePage
        title={t.heading}
        description={t.description}
        action={
          // A full page load resets the app after an unexpected error.
          <Button asChild variant="outline" size="lg">
            <a href="/">{t.backHome}</a>
          </Button>
        }
      />
    </main>
  );
}

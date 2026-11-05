import { MessagePage } from './MessagePage';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';

/** A failed load, with a way to try again. The failure itself is not detailed to the person. */
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const t = text.teacher.load;
  return (
    <div role="alert">
      <MessagePage
        title={t.failedTitle}
        description={t.failedDescription}
        action={
          <Button type="button" variant="outline" size="lg" onClick={onRetry}>
            {t.retry}
          </Button>
        }
      />
    </div>
  );
}

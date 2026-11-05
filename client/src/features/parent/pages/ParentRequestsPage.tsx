import { RequestsInbox } from '@/features/subject-requests/components/RequestsInbox';
import { text } from '@/text/sr-Latn';

/** "Zahtjevi za potvrdu": the children's requests to join a subject, which a parent confirms. */
export function ParentRequestsPage() {
  const t = text.guardian.requests;

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">{t.heading}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{t.intro}</p>
      <RequestsInbox status="awaiting_parent" copy={t} />
    </>
  );
}

import { subjectLessonsPath } from '@/features/lessons/paths';
import { text } from '@/text/sr-Latn';
import { RequestsInbox } from '../components/RequestsInbox';

/** "Zahtjevi za predmete": students who want to join a subject, after a parent confirmed. */
export function RequestsPage() {
  const t = text.teacher.requests;

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">{t.heading}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{t.intro}</p>
      <RequestsInbox
        status="awaiting_teacher"
        copy={t}
        subjectLink={(request) => subjectLessonsPath(request.subject.id)}
      />
    </>
  );
}

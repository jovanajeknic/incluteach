import { CaretRightIcon } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { conversationPath } from '@/features/lessons/paths';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { formatDate } from '@/shared/lib/format';
import { text } from '@/text/sr-Latn';
import { useInbox } from '../api/queries';

/** "Poruke" of the teacher: every conversation that has a message, the newest first. */
export function MessagesPage() {
  return <MessagesInbox copy={text.teacher.messages} hrefFor={conversationPath} />;
}

/** The words of an inbox: the teacher and a parent each have their own. */
interface InboxCopy {
  pageTitle: string;
  heading: string;
  intro: string;
  empty: string;
  about: (student: string, subject: string) => string;
  count: (count: number) => string;
  lastFrom: (name: string, body: string) => string;
  open: (student: string, subject: string) => string;
}

interface MessagesInboxProps {
  copy: InboxCopy;
  /** Where a conversation opens, from the subject and the student it is about. */
  hrefFor: (subjectId: string, studentId: string) => string;
}

/** Every conversation that has a message, the one with the newest message first. */
export function MessagesInbox({ copy: t, hrefFor }: MessagesInboxProps) {
  const inbox = useInbox();

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">{t.heading}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{t.intro}</p>

      {inbox.isPending ? (
        <LoadingState label={text.teacher.load.loading} />
      ) : inbox.isError ? (
        <ErrorState onRetry={() => void inbox.refetch()} />
      ) : inbox.data.conversations.length === 0 ? (
        <p className="mt-8 text-lg text-ink-soft">{t.empty}</p>
      ) : (
        <ul className="mt-6 grid max-w-3xl gap-3">
          {inbox.data.conversations.map(({ student, subject, messageCount, lastMessage }) => (
            <li key={`${subject.id}-${student.id}`}>
              <Link
                to={hrefFor(subject.id, student.id)}
                aria-label={t.open(student.fullName, subject.name)}
                className="group flex items-center gap-4 rounded-3xl bg-card px-5 py-4 shadow-soft transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lifted"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg font-semibold break-words text-ink">
                    {t.about(student.fullName, subject.name)}
                  </span>
                  <span className="mt-0.5 block truncate text-ink-soft">
                    {t.lastFrom(lastMessage.author.fullName, lastMessage.body)}
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-soft">
                    {t.count(messageCount)} · {formatDate(lastMessage.createdAt)}
                  </span>
                </span>
                <CaretRightIcon
                  aria-hidden="true"
                  weight="bold"
                  className="size-5 shrink-0 text-ink-soft transition-transform group-hover:translate-x-1"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

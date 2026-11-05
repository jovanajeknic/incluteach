import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useParams } from 'react-router';
import { z } from 'zod';
import { useSession } from '@/features/auth/api/session';
import { lessonErrorMessage } from '@/features/lessons/apiErrorMessage';
import { subjectStudentPath } from '@/features/lessons/paths';
import { ApiError } from '@/shared/api/apiClient';
import { ErrorState } from '@/shared/components/ErrorState';
import { FormField } from '@/shared/components/FormField';
import { LoadingState } from '@/shared/components/LoadingState';
import { MessagePage } from '@/shared/components/MessagePage';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';
import { text } from '@/text/sr-Latn';
import { useConversation, useSendMessage } from '../api/queries';
import { MESSAGE_MAX_LENGTH, type Message } from '../api/conversationsApi';

const t = text.teacher.conversation;

const messageSchema = z.object({
  body: z.string().trim().min(1, t.messageRequired).max(MESSAGE_MAX_LENGTH, t.messageTooLong),
});
type MessageValues = z.output<typeof messageSchema>;

const dateTime = new Intl.DateTimeFormat('sr-Latn-ME', { dateStyle: 'medium', timeStyle: 'short' });

/** The conversation of the parents of one student with the teacher of one subject. */
export function ConversationPage() {
  const { subjectId = '', studentId = '' } = useParams();
  const conversation = useConversation(subjectId, studentId);

  if (conversation.isPending) return <LoadingState label={text.teacher.load.loading} />;

  if (conversation.isError) {
    const missing =
      conversation.error instanceof ApiError &&
      (conversation.error.status === 404 || conversation.error.status === 403);
    if (!missing) return <ErrorState onRetry={() => void conversation.refetch()} />;
    return (
      <>
        <title>{text.app.pageTitle(t.notFoundTitle)}</title>
        <MessagePage title={t.notFoundTitle} description={t.notFoundDescription} />
      </>
    );
  }

  const { student, subject, messages, total } = conversation.data;

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle(student.fullName))}</title>
      <Link
        to={subjectStudentPath(subjectId, studentId)}
        className="inline-flex items-center gap-1.5 rounded-full font-display font-medium text-ink-soft hover:text-forest"
      >
        <ArrowLeftIcon aria-hidden="true" weight="bold" className="size-4" />
        {t.back}
      </Link>

      <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight text-ink">
        {t.heading}
      </h1>
      <p className="mt-1 font-display text-lg font-medium text-ink-soft">
        {t.about(student.fullName, subject.name)}
      </p>
      <p className="mt-3 max-w-2xl text-ink-soft">{t.privacy}</p>

      <MessageList messages={messages} total={total} />
      <WriteMessage subjectId={subjectId} studentId={studentId} />
    </>
  );
}

function MessageList({ messages, total }: { messages: Message[]; total: number }) {
  const { user } = useSession();
  const end = useRef<HTMLDivElement>(null);
  const lastId = messages.at(-1)?.id;

  // A new message scrolls into view; the first load shows the end of the conversation too.
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'nearest' });
  }, [lastId]);

  if (messages.length === 0) return <p className="mt-8 text-lg text-ink-soft">{t.empty}</p>;

  return (
    <section aria-label={t.listLabel} className="mt-6 max-w-3xl">
      {total > messages.length && (
        <p className="mb-3 text-sm text-ink-soft">{t.onlyNewest(messages.length, total)}</p>
      )}
      {/* role="log": a new message is read out politely, without moving the focus. */}
      <ol role="log" aria-live="polite" className="grid gap-3">
        {messages.map((message) => {
          const mine = message.author.id === user?.id;
          return (
            <li key={message.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[85%] rounded-3xl px-5 py-3',
                  mine ? 'bg-mint text-mint-ink' : 'bg-card text-ink shadow-soft',
                )}
              >
                <p className="text-sm font-medium">
                  {mine ? t.you : message.author.fullName}
                  <span className="font-normal opacity-80">
                    {' '}
                    · {t.roles[message.author.role]} ·{' '}
                    {dateTime.format(new Date(message.createdAt))}
                  </span>
                </p>
                {/* Line breaks written by the sender are kept. */}
                <p className="mt-1 break-words whitespace-pre-wrap">{message.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <div ref={end} />
    </section>
  );
}

function WriteMessage({ subjectId, studentId }: { subjectId: string; studentId: string }) {
  const send = useSendMessage();
  const [problem, setProblem] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<MessageValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: { body: '' },
  });
  const body = useWatch({ control, name: 'body' });

  async function onValid(values: MessageValues) {
    setProblem(null);
    try {
      await send.mutateAsync({ subjectId, studentId, body: values.body });
      reset({ body: '' });
    } catch (error) {
      // What was written stays, so it does not have to be typed again.
      setProblem(lessonErrorMessage(error));
    }
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onValid, () => setProblem(null))}
      className="mt-8 flex max-w-3xl flex-col gap-3 rounded-3xl bg-lilac/40 p-5"
    >
      <FormField
        id="message-body"
        label={t.writeLabel}
        hint={t.writeHint}
        error={errors.body?.message}
        required
      >
        {(props) => (
          <Textarea
            {...props}
            {...register('body')}
            rows={4}
            className="min-h-28 rounded-2xl bg-card text-base leading-relaxed md:text-base"
          />
        )}
      </FormField>
      <p
        className={cn(
          'text-sm',
          body.length > MESSAGE_MAX_LENGTH ? 'font-medium text-destructive' : 'text-ink-soft',
        )}
      >
        {t.counter(body.length, MESSAGE_MAX_LENGTH)}
      </p>
      {problem && (
        <p role="alert" className="font-medium text-destructive">
          {problem}
        </p>
      )}
      <div>
        <Button type="submit" size="lg" disabled={isSubmitting} aria-busy={isSubmitting}>
          <PaperPlaneTiltIcon aria-hidden="true" weight="fill" />
          {isSubmitting ? t.sending : t.send}
        </Button>
      </div>
    </form>
  );
}

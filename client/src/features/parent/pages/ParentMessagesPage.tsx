import { MessagesInbox } from '@/features/conversations/pages/MessagesPage';
import { text } from '@/text/sr-Latn';
import { childConversationPath } from '../paths';

/** "Poruke" of a parent: the conversations about their children, the newest first. */
export function ParentMessagesPage() {
  return (
    <MessagesInbox
      copy={text.guardian.messages}
      // In the inbox a conversation is about a student, who is the child of this parent.
      hrefFor={(subjectId, studentId) => childConversationPath(studentId, subjectId)}
    />
  );
}

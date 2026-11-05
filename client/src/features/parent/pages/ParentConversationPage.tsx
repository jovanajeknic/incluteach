import { useParams } from 'react-router';
import { BackLink, ConversationView } from '@/features/conversations/pages/ConversationPage';
import { text } from '@/text/sr-Latn';
import { ChildGate } from '../components/ChildGate';
import { childSubjectPath } from '../paths';

/**
 * The conversation of the parents of a child with the teacher of a subject. It is started from
 * the page of the subject of the child; the other parent of the child and the teacher see it too.
 */
export function ParentConversationPage() {
  const { childId = '', subjectId = '' } = useParams();

  return (
    <ChildGate childId={childId}>
      {(child) => (
        <ConversationView
          audience="parent"
          subjectId={subjectId}
          studentId={child.id}
          back={
            <BackLink to={childSubjectPath(child.id, subjectId)}>
              {text.guardian.conversation.back(child.fullName)}
            </BackLink>
          }
        />
      )}
    </ChildGate>
  );
}

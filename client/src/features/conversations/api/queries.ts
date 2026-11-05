import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { conversationsApi } from './conversationsApi';

/**
 * The server cannot push, so an open conversation asks again every few seconds (and the inbox
 * less often). TanStack Query stops asking while the browser tab is in the background.
 */
const MESSAGES_POLL_MS = 5000;
const INBOX_POLL_MS = 15000;

export const useInbox = () =>
  useQuery({
    queryKey: ['conversations', 'inbox'],
    queryFn: conversationsApi.inbox,
    refetchInterval: INBOX_POLL_MS,
  });

export const useConversation = (subjectId: string, studentId: string) =>
  useQuery({
    queryKey: ['conversations', 'messages', subjectId, studentId],
    queryFn: () => conversationsApi.messages(subjectId, studentId),
    refetchInterval: MESSAGES_POLL_MS,
  });

export function useSendMessage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: conversationsApi.send,
    // The new message appears in the conversation and moves it to the top of the inbox.
    onSuccess: () => client.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

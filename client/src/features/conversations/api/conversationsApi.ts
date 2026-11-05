import { apiRequest } from '@/shared/api/apiClient';

/** Limits of the API (see API-CONTRACT.md, "Conversations"). */
export const MESSAGE_MAX_LENGTH = 1000;
/** The newest messages asked for at once (the most the server gives). */
const MESSAGES_LIMIT = 200;

export interface Message {
  id: string;
  author: { id: string; fullName: string; role: 'parent' | 'teacher' };
  body: string;
  createdAt: string;
}

/** One line of the inbox: a student in a subject, with the newest message. */
export interface ConversationSummary {
  student: { id: string; fullName: string };
  subject: { id: string; name: string };
  messageCount: number;
  lastMessage: Message;
}

export interface Conversation {
  student: { id: string; fullName: string };
  subject: { id: string; name: string };
  /** The newest messages, oldest first. */
  messages: Message[];
  /** All messages of the conversation; more than `messages` when it is long. */
  total: number;
}

export const conversationsApi = {
  inbox: () => apiRequest<{ conversations: ConversationSummary[] }>('/conversations'),
  messages: (subjectId: string, studentId: string) =>
    apiRequest<Conversation>(
      `/conversations/messages?${new URLSearchParams({
        subjectId,
        studentId,
        limit: String(MESSAGES_LIMIT),
      })}`,
    ),
  send: (input: { subjectId: string; studentId: string; body: string }) =>
    apiRequest<{ message: Message }>('/conversations/messages', { method: 'POST', body: input }),
};

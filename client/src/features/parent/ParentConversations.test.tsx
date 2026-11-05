import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { Conversation, Message } from '@/features/conversations/api/conversationsApi';
import { apiError, testUsers } from '@/test/authFixtures';
import { biology5b } from '@/test/lessonApiFixtures';
import { renderApp } from '@/test/renderApp';
import { server } from '@/test/server';
import { enrollmentOf, progressOf } from '@/test/studentApiFixtures';

const ANA = { id: '40000000-0000-4000-8000-000000000001', fullName: 'Ana Marković' };
const CONVERSATION_PATH = `/parent/children/${ANA.id}/subjects/${biology5b.id}/conversation`;
const ME = testUsers.parent;

const me = { id: ME.id, fullName: ME.fullName, role: 'parent' as const };
const otherParent = { id: 'parent-2', fullName: 'Jelena Marković', role: 'parent' as const };
const teacher = { id: 'teacher-1', fullName: 'Milica Petrović', role: 'teacher' as const };

const message = (id: string, author: Message['author'], body: string): Message => ({
  id,
  author,
  body,
  createdAt: '2026-11-04T09:00:00.000Z',
});

const opening = [
  message('m1', teacher, 'Ana je danas dobro radila.'),
  message('m2', me, 'Hvala na javljanju.'),
  message('m3', otherParent, 'I ja se zahvaljujem.'),
];

function keepConversation(initial: Message[] = opening) {
  const state = { messages: initial, sent: [] as unknown[], asked: [] as URLSearchParams[] };
  server.use(
    http.get('*/api/children', () => HttpResponse.json({ children: [ANA] })),
    http.get('*/api/conversations/messages', ({ request }) => {
      state.asked.push(new URL(request.url).searchParams);
      const answer: Conversation = {
        student: ANA,
        subject: { id: biology5b.id, name: 'Biologija' },
        messages: state.messages,
        total: state.messages.length,
      };
      return HttpResponse.json(answer);
    }),
    http.post('*/api/conversations/messages', async ({ request }) => {
      const body = (await request.json()) as { body: string };
      state.sent.push(body);
      const created = message(`new-${state.messages.length}`, me, body.body);
      state.messages = [...state.messages, created];
      return HttpResponse.json({ message: created }, { status: 201 });
    }),
  );
  return state;
}

describe('The conversation of a parent with the teacher', () => {
  it('is started from the page of the subject of the child', async () => {
    server.use(
      http.get('*/api/children', () => HttpResponse.json({ children: [ANA] })),
      http.get('*/api/enrollments', () =>
        HttpResponse.json({ enrollments: [enrollmentOf({ student: ANA })], total: 1 }),
      ),
      http.get('*/api/subjects/:id/progress', () =>
        HttpResponse.json(progressOf([], [{ id: 'l1', title: 'Fotosinteza' }])),
      ),
      http.get('*/api/lessons', () => HttpResponse.json({ lessons: [], total: 0 })),
    );
    renderApp({ path: `/parent/children/${ANA.id}/subjects/${biology5b.id}` });

    expect(await screen.findByRole('link', { name: 'Razgovor sa nastavnikom' })).toHaveAttribute(
      'href',
      CONVERSATION_PATH,
    );
  });

  it('shows the messages with who wrote them, and tells who else can read them', async () => {
    const state = keepConversation();
    renderApp({ path: CONVERSATION_PATH });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Razgovor sa nastavnikom' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ana Marković · Biologija')).toBeInTheDocument();
    expect(screen.getByText(/nastavnik predmeta i svi roditelji ovog djeteta/)).toBeInTheDocument();
    expect(screen.getByText(/Dijete ga ne vidi/)).toBeInTheDocument();
    const items = within(await screen.findByRole('log')).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Milica Petrović · nastavnik');
    expect(items[1]).toHaveTextContent('Ti · roditelj');
    expect(items[2]).toHaveTextContent('Jelena Marković · roditelj');
    // The conversation asked for is the one about this child and this subject.
    expect(state.asked[0]!.get('studentId')).toBe(ANA.id);
    expect(state.asked[0]!.get('subjectId')).toBe(biology5b.id);
    expect(screen.getByRole('link', { name: 'Nazad na predmet: Ana Marković' })).toHaveAttribute(
      'href',
      `/parent/children/${ANA.id}/subjects/${biology5b.id}`,
    );
  });

  it('sends a message about this child and this subject, and shows it at once', async () => {
    const state = keepConversation();
    const { user } = renderApp({ path: CONVERSATION_PATH });

    await user.type(await screen.findByLabelText(/Tvoja poruka/), 'Može li dodatna vježba?');
    await user.click(screen.getByRole('button', { name: 'Pošalji' }));

    await waitFor(() =>
      expect(within(screen.getByRole('log')).getAllByRole('listitem')).toHaveLength(4),
    );
    expect(state.sent).toEqual([
      { subjectId: biology5b.id, studentId: ANA.id, body: 'Može li dodatna vježba?' },
    ]);
  });

  it('invites to write the first message when there is none', async () => {
    keepConversation([]);
    renderApp({ path: CONVERSATION_PATH });

    expect(await screen.findByText('Još nema poruka. Napiši prvu.')).toBeInTheDocument();
  });

  it('says the conversation does not exist when the child has not joined the subject', async () => {
    server.use(
      http.get('*/api/children', () => HttpResponse.json({ children: [ANA] })),
      http.get('*/api/conversations/messages', () =>
        HttpResponse.json(apiError('not_found'), { status: 404 }),
      ),
    );
    renderApp({ path: CONVERSATION_PATH });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Razgovor nije pronađen' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Dijete nije upisano na ovaj predmet.')).toBeInTheDocument();
  });

  it('is refused for a child who is not on the list of the parent, without asking for messages', async () => {
    const state = keepConversation();
    renderApp({
      path: `/parent/children/99999999-0000-4000-8000-000000000009/subjects/${biology5b.id}/conversation`,
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Nemate pristup' }),
    ).toBeInTheDocument();
    expect(state.asked).toEqual([]);
  });
});

describe('Poruke of a parent', () => {
  it('lists the conversations about the children and opens one', async () => {
    keepConversation();
    server.use(
      http.get('*/api/conversations', () =>
        HttpResponse.json({
          conversations: [
            {
              student: ANA,
              subject: { id: biology5b.id, name: 'Biologija' },
              messageCount: 3,
              lastMessage: opening[2],
            },
          ],
        }),
      ),
    );
    const { user, router } = renderApp({ path: '/parent/messages' });

    const row = await screen.findByRole('link', {
      name: 'Otvori razgovor: Ana Marković, Biologija',
    });
    expect(row).toHaveTextContent('Jelena Marković: I ja se zahvaljujem.');
    expect(row).toHaveTextContent('3 poruke');

    await user.click(row);
    await waitFor(() => expect(router.state.location.pathname).toBe(CONVERSATION_PATH));
  });

  it('is in the menu, and says how to start the first conversation', async () => {
    server.use(
      http.get('*/api/children', () => HttpResponse.json({ children: [ANA] })),
      http.get('*/api/conversations', () => HttpResponse.json({ conversations: [] })),
    );
    renderApp({ path: '/parent/messages' });

    expect(await screen.findByText(/Počni ga sa stranice predmeta/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Poruke' })).toHaveAttribute('aria-current', 'page');
  });

  it('offers a retry when the inbox cannot be loaded', async () => {
    let calls = 0;
    server.use(
      http.get('*/api/conversations', () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(apiError('internal_error'), { status: 500 })
          : HttpResponse.json({ conversations: [] });
      }),
    );
    const { user } = renderApp({ path: '/parent/messages' });

    await user.click(await screen.findByRole('button', { name: 'Pokušaj ponovo' }));

    expect(await screen.findByText(/Još nema razgovora/)).toBeInTheDocument();
  });
});

import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { Conversation, Message } from '@/features/conversations/api/conversationsApi';
import { apiError, testUsers } from '@/test/authFixtures';
import { biology5b } from '@/test/lessonApiFixtures';
import { renderApp } from '@/test/renderApp';
import { server } from '@/test/server';

const ANA = { id: '40000000-0000-4000-8000-000000000001', fullName: 'Ana Marković' };
const CONVERSATION_PATH = `/teacher/subjects/${biology5b.id}/students/${ANA.id}/conversation`;
const MINE = testUsers.teacher;

const parentPetar = { id: 'parent-1', fullName: 'Petar Marković', role: 'parent' as const };
const parentJelena = { id: 'parent-2', fullName: 'Jelena Marković', role: 'parent' as const };
const me = { id: MINE.id, fullName: MINE.fullName, role: 'teacher' as const };

function message(overrides: Partial<Message> & { id: string }): Message {
  return {
    author: parentPetar,
    body: 'Dobar dan.',
    createdAt: '2026-11-04T09:00:00.000Z',
    ...overrides,
  };
}

const opening: Message[] = [
  message({ id: 'm1', body: 'Dobar dan, kako Ana napreduje?' }),
  message({
    id: 'm2',
    author: me,
    body: 'Dobro napreduje.\nPohvaljujem je.',
    createdAt: '2026-11-04T10:00:00.000Z',
  }),
  message({
    id: 'm3',
    author: parentJelena,
    body: 'Hvala, i ja pratim.',
    createdAt: '2026-11-04T11:00:00.000Z',
  }),
];

/** A fake server that keeps the conversation, so a sent message shows in the next answer. */
function keepConversation(initial: Message[], total = initial.length) {
  const state = { messages: initial, sent: [] as unknown[], asked: 0 };
  const answer = (): Conversation => ({
    student: ANA,
    subject: { id: biology5b.id, name: 'Biologija' },
    messages: state.messages,
    total: Math.max(total, state.messages.length),
  });
  server.use(
    http.get('*/api/conversations/messages', ({ request }) => {
      state.asked += 1;
      const query = new URL(request.url).searchParams;
      expect(query.get('studentId')).toBe(ANA.id);
      expect(query.get('subjectId')).toBe(biology5b.id);
      return HttpResponse.json(answer());
    }),
    http.post('*/api/conversations/messages', async ({ request }) => {
      const body = (await request.json()) as { body: string };
      state.sent.push(body);
      const created = message({ id: `new-${state.messages.length}`, author: me, body: body.body });
      state.messages = [...state.messages, created];
      return HttpResponse.json({ message: created }, { status: 201 });
    }),
  );
  return state;
}

describe('Poruke (inbox)', () => {
  it('lists the conversations with the newest message, and opens one', async () => {
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
            {
              student: { id: 'st2', fullName: 'Luka Stanić' },
              subject: { id: 'sub2', name: 'Matematika' },
              messageCount: 1,
              lastMessage: message({ id: 'x', body: 'Pitanje o zadaći' }),
            },
          ],
        }),
      ),
    );
    const { user, router } = renderApp({ path: '/teacher/messages' });

    const first = await screen.findByRole('link', {
      name: 'Otvori razgovor: Ana Marković, Biologija',
    });
    expect(first).toHaveTextContent('Ana Marković · Biologija');
    expect(first).toHaveTextContent('Jelena Marković: Hvala, i ja pratim.');
    expect(first).toHaveTextContent('3 poruke');
    expect(screen.getByRole('link', { name: /Luka Stanić, Matematika/ })).toHaveTextContent(
      '1 poruka',
    );

    keepConversation(opening);
    await user.click(first);
    await waitFor(() => expect(router.state.location.pathname).toBe(CONVERSATION_PATH));
  });

  it('has an item in the menu, and says so when there are no conversations', async () => {
    server.use(http.get('*/api/conversations', () => HttpResponse.json({ conversations: [] })));
    renderApp({ path: '/teacher/messages' });

    expect(await screen.findByText(/Još nema razgovora/)).toBeInTheDocument();
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
    const { user } = renderApp({ path: '/teacher/messages' });

    await user.click(await screen.findByRole('button', { name: 'Pokušaj ponovo' }));

    expect(await screen.findByText(/Još nema razgovora/)).toBeInTheDocument();
  });
});

describe('A conversation', () => {
  it('shows the messages oldest first, with who wrote them, and keeps line breaks', async () => {
    keepConversation(opening);
    renderApp({ path: CONVERSATION_PATH });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Razgovor sa roditeljima' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ana Marković · Biologija')).toBeInTheDocument();
    expect(screen.getByText(/ovaj razgovor vide ti i svi roditelji/i)).toBeInTheDocument();
    const log = await screen.findByRole('log');
    const items = within(log).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Petar Marković · roditelj');
    expect(items[0]).toHaveTextContent('Dobar dan, kako Ana napreduje?');
    // The teacher's own message says "Ti".
    expect(items[1]).toHaveTextContent('Ti · nastavnik');
    expect(items[1]!.querySelector('p.whitespace-pre-wrap')!.textContent).toBe(
      'Dobro napreduje.\nPohvaljujem je.',
    );
    expect(items[2]).toHaveTextContent('Jelena Marković · roditelj');
  });

  it('tells when only the newest messages are shown', async () => {
    keepConversation(opening, 450);
    renderApp({ path: CONVERSATION_PATH });

    expect(
      await screen.findByText('Prikazano je posljednjih 3 od 450 poruka.'),
    ).toBeInTheDocument();
  });

  it('invites to write the first message when there is none', async () => {
    keepConversation([]);
    renderApp({ path: CONVERSATION_PATH });

    expect(await screen.findByText('Još nema poruka. Napiši prvu.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Tvoja poruka/)).toBeInTheDocument();
  });

  it('sends a message, shows it at once and clears the field', async () => {
    const state = keepConversation(opening);
    const { user } = renderApp({ path: CONVERSATION_PATH });
    const field = await screen.findByLabelText(/Tvoja poruka/);

    await user.type(field, '  Hvala vam na poruci.{Enter}Pozdrav!  ');
    expect(screen.getByText('33 od 1000 znakova')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pošalji' }));

    await waitFor(() =>
      expect(within(screen.getByRole('log')).getAllByRole('listitem')).toHaveLength(4),
    );
    expect(state.sent).toEqual([
      { subjectId: biology5b.id, studentId: ANA.id, body: 'Hvala vam na poruci.\nPozdrav!' },
    ]);
    expect(field).toHaveValue('');
  });

  it('does not send an empty message, or one that is too long', async () => {
    const state = keepConversation(opening);
    const { user } = renderApp({ path: CONVERSATION_PATH });
    const field = await screen.findByLabelText(/Tvoja poruka/);

    await user.click(screen.getByRole('button', { name: 'Pošalji' }));
    expect(await screen.findByText('Napiši poruku.')).toBeInTheDocument();

    await user.click(field);
    await user.paste('x'.repeat(1001));
    await user.click(screen.getByRole('button', { name: 'Pošalji' }));
    expect(await screen.findByText('Poruka može imati najviše 1000 znakova.')).toBeInTheDocument();
    expect(state.sent).toEqual([]);
  });

  it('keeps what was written and explains when sending fails', async () => {
    keepConversation(opening);
    server.use(http.post('*/api/conversations/messages', () => HttpResponse.error()));
    const { user } = renderApp({ path: CONVERSATION_PATH });
    const field = await screen.findByLabelText(/Tvoja poruka/);

    await user.type(field, 'Važna poruka');
    await user.click(screen.getByRole('button', { name: 'Pošalji' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Server trenutno nije dostupan');
    expect(field).toHaveValue('Važna poruka');
    expect(screen.getByRole('button', { name: 'Pošalji' })).toBeEnabled();
  });

  it('says it does not exist when the student has not joined the subject', async () => {
    server.use(
      http.get('*/api/conversations/messages', () =>
        HttpResponse.json(apiError('not_found'), { status: 404 }),
      ),
    );
    renderApp({ path: CONVERSATION_PATH });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Razgovor nije pronađen' }),
    ).toBeInTheDocument();
  });

  it('shows a message that arrives while the page is open, without being touched', async () => {
    const state = keepConversation(opening);
    renderApp({ path: CONVERSATION_PATH });
    await screen.findByRole('log');

    // The other parent writes; the page asks again by itself every few seconds.
    state.messages = [
      ...state.messages,
      message({ id: 'm4', author: parentJelena, body: 'Stigla sam kasnije.' }),
    ];

    expect(
      await screen.findByText('Stigla sam kasnije.', {}, { timeout: 7000 }),
    ).toBeInTheDocument();
    expect(state.asked).toBeGreaterThan(1);
  }, 12000);

  it('is reached from the page of the student', async () => {
    server.use(
      http.get('*/api/subjects/mine', () =>
        HttpResponse.json({ subjects: [biology5b], schoolYear: 2026 }),
      ),
      http.get('*/api/subjects/:id/progress', () =>
        HttpResponse.json({
          student: ANA,
          subject: { id: biology5b.id, name: 'Biologija' },
          lessons: { published: 0, completed: 0 },
          stars: { automatic: 0, teacher: 0 },
          items: [],
        }),
      ),
      http.get('*/api/stars', () =>
        HttpResponse.json({ stars: [], counts: { automatic: 0, teacher: 0 } }),
      ),
    );
    renderApp({ path: `/teacher/subjects/${biology5b.id}/students/${ANA.id}` });

    expect(await screen.findByRole('link', { name: 'Razgovor sa roditeljima' })).toHaveAttribute(
      'href',
      CONVERSATION_PATH,
    );
  });
});

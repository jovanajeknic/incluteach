import type { AuthUser } from '../auth/sessions.ts';
import type { Queryable } from '../db/pool.ts';
import { resolveChild } from '../enrollments/enrollments.ts';
import { HttpError } from '../http/errors.ts';

export interface Message {
  id: string;
  author: { id: string; fullName: string; role: 'parent' | 'teacher' };
  body: string;
  createdAt: string;
}

interface Thread {
  student: { id: string; fullName: string };
  subject: { id: string; name: string };
}

const notFound = () => new HttpError(404, 'not_found', 'Conversation not found.');

// Finds out if this person may take part in the conversation about a student in a subject, and
// names both. Only these may:
// - the teacher of the subject, if the student has joined it;
// - a parent linked to the student, if the student has joined the subject.
// Everybody else (the student, the admin, other parents and teachers) gets nothing.
async function requireThread(
  pool: Queryable,
  { user, studentId, subjectId }: { user: AuthUser; studentId?: string; subjectId: string },
): Promise<Thread> {
  if (user.role !== 'parent' && user.role !== 'teacher') {
    throw new HttpError(403, 'forbidden', 'You are not allowed to do this.');
  }
  if (!studentId) {
    throw new HttpError(400, 'invalid_student', 'Choose a student.');
  }
  // A parent naming a child that is not theirs gets 403, as everywhere else.
  const child = user.role === 'parent' ? await resolveChild(pool, user, studentId) : studentId;

  const params: unknown[] = [user.schoolId, subjectId, child];
  let teacherOnly = '';
  if (user.role === 'teacher') {
    params.push(user.id);
    teacherOnly = `AND s.teacher_id = $${params.length}`;
  }
  const { rows } = await pool.query<{ student_name: string; subject_name: string }>(
    `SELECT u.full_name AS student_name, s.name AS subject_name
     FROM subjects s
     JOIN enrollments e ON e.subject_id = s.id AND e.status = 'approved'
     JOIN users u ON u.id = e.student_id AND u.role = 'student'
     WHERE s.school_id = $1 AND s.id = $2 AND e.student_id = $3 ${teacherOnly}`,
    params,
  );
  if (!rows[0]) {
    throw notFound();
  }
  return {
    student: { id: child, fullName: rows[0].student_name },
    subject: { id: subjectId, name: rows[0].subject_name },
  };
}

interface MessageRow {
  id: string;
  author_id: string;
  author_name: string;
  author_role: 'parent' | 'teacher';
  body: string;
  created_at: Date;
}

const toMessage = (row: MessageRow): Message => ({
  id: row.id,
  author: { id: row.author_id, fullName: row.author_name, role: row.author_role },
  body: row.body,
  createdAt: row.created_at.toISOString(),
});

export interface Conversation extends Thread {
  // The newest messages, oldest first.
  messages: Message[];
  total: number;
}

export async function getConversation(
  pool: Queryable,
  options: { user: AuthUser; studentId?: string; subjectId: string; limit: number },
): Promise<Conversation> {
  const thread = await requireThread(pool, options);

  const { rows: counted } = await pool.query<{ total: string }>(
    'SELECT count(*) AS total FROM conversation_messages WHERE student_id = $1 AND subject_id = $2',
    [thread.student.id, thread.subject.id],
  );
  const { rows } = await pool.query<MessageRow>(
    `SELECT * FROM (
       SELECT m.id, m.seq, m.author_id, a.full_name AS author_name, m.author_role, m.body, m.created_at
       FROM conversation_messages m JOIN users a ON a.id = m.author_id
       WHERE m.student_id = $1 AND m.subject_id = $2
       ORDER BY m.seq DESC LIMIT $3
     ) newest ORDER BY seq`,
    [thread.student.id, thread.subject.id, options.limit],
  );
  return { ...thread, messages: rows.map(toMessage), total: Number(counted[0].total) };
}

export async function addMessage(
  pool: Queryable,
  {
    user,
    studentId,
    subjectId,
    body,
  }: { user: AuthUser; studentId?: string; subjectId: string; body: string },
): Promise<Message & Thread> {
  const thread = await requireThread(pool, { user, studentId, subjectId });
  const { rows } = await pool.query<{ id: string; created_at: Date }>(
    `INSERT INTO conversation_messages (school_id, student_id, subject_id, author_id, author_role, body)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
    [user.schoolId, thread.student.id, thread.subject.id, user.id, user.role, body],
  );
  return {
    ...thread,
    id: rows[0].id,
    author: { id: user.id, fullName: user.fullName, role: user.role as 'parent' | 'teacher' },
    body,
    createdAt: rows[0].created_at.toISOString(),
  };
}

export interface ConversationSummary extends Thread {
  messageCount: number;
  lastMessage: Message;
}

// The conversations that have messages, the one with the newest message first:
// - a teacher: those about students of the subjects they teach;
// - a parent: those about their children.
export async function listConversations(
  pool: Queryable,
  { user, limit }: { user: AuthUser; limit: number },
): Promise<ConversationSummary[]> {
  if (user.role !== 'parent' && user.role !== 'teacher') {
    throw new HttpError(403, 'forbidden', 'You are not allowed to do this.');
  }
  const mine =
    user.role === 'teacher'
      ? 's.teacher_id = $2'
      : 'm.student_id IN (SELECT student_id FROM parent_students WHERE parent_id = $2)';

  const { rows } = await pool.query<
    MessageRow & {
      student_id: string;
      student_name: string;
      subject_id: string;
      subject_name: string;
      message_count: string;
    }
  >(
    `SELECT t.student_id, st.full_name AS student_name, t.subject_id, s.name AS subject_name,
            t.message_count, last.id, last.author_id, a.full_name AS author_name,
            last.author_role, last.body, last.created_at
     FROM (
       SELECT m.student_id, m.subject_id, count(*) AS message_count, max(m.seq) AS last_seq
       FROM conversation_messages m JOIN subjects s ON s.id = m.subject_id
       WHERE m.school_id = $1 AND ${mine}
       GROUP BY m.student_id, m.subject_id
     ) t
     JOIN conversation_messages last ON last.seq = t.last_seq
     JOIN users st ON st.id = t.student_id
     JOIN users a ON a.id = last.author_id
     JOIN subjects s ON s.id = t.subject_id
     ORDER BY t.last_seq DESC
     LIMIT $3`,
    [user.schoolId, user.id, limit],
  );
  return rows.map((row) => ({
    student: { id: row.student_id, fullName: row.student_name },
    subject: { id: row.subject_id, name: row.subject_name },
    messageCount: Number(row.message_count),
    lastMessage: toMessage(row),
  }));
}

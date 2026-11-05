import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPool } from '../db/pool.ts';
import {
  insertActivatedUser,
  insertClass,
  insertEnrollment,
  insertParentStudent,
  insertSubject,
} from '../db/testUtils.ts';
import { inApi as runWithApi, PASSWORD, type Api, type Requests } from './testApi.ts';

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('the conversation of parents and a teacher', () => {
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  const inApi = (run: (api: Api) => Promise<void>) => runWithApi(pool, run);

  interface World {
    subjectId: string;
    otherSubjectId: string;
    secondParentId: string;
    teacher: Requests;
    otherTeacher: Requests;
    student: Requests;
    parent: Requests;
    secondParent: Requests;
    // A parent of nobody in this story.
    strangerParent: Requests;
  }

  // Ana joined the subject of the teacher and has two parents, Petar and a second one. A second
  // teacher teaches a subject Ana has not joined. A third parent has no children here.
  async function setup(api: Api): Promise<World> {
    const { client, f } = api;
    const account = (role: 'teacher' | 'parent', username: string) =>
      insertActivatedUser(client, f.schoolId, role, {
        username,
        email: `${username}@example.com`,
        password: PASSWORD,
      });
    const otherTeacherId = await account('teacher', 'mira_miric');
    const secondParentId = await account('parent', 'drugi_roditelj');
    await account('parent', 'tudji_roditelj');
    const classId = await insertClass(client, f.schoolId, '5-2', 2026);
    const subjectId = await insertSubject(client, f.schoolId, classId, f.teacherId, 'Biologija');
    const otherSubjectId = await insertSubject(
      client,
      f.schoolId,
      classId,
      otherTeacherId,
      'Fizika',
    );
    await insertParentStudent(client, f.schoolId, f.parentId, f.studentId, f.adminId);
    await insertParentStudent(client, f.schoolId, secondParentId, f.studentId, f.adminId);
    await insertEnrollment(client, {
      schoolId: f.schoolId,
      studentId: f.studentId,
      subjectId,
      requestedBy: f.studentId,
      requestedByRole: 'student',
      status: 'approved',
      parentDecidedBy: f.parentId,
      teacherDecidedBy: f.teacherId,
    });
    return {
      subjectId,
      otherSubjectId,
      secondParentId,
      teacher: await api.as('jovan_jovanovic'),
      otherTeacher: await api.as('mira_miric'),
      student: await api.as('ana_ivic'),
      parent: await api.as('petar_ivic'),
      secondParent: await api.as('drugi_roditelj'),
      strangerParent: await api.as('tudji_roditelj'),
    };
  }

  const say = (who: Requests, api: Api, w: World, body: unknown, subjectId = w.subjectId) =>
    who.post('/conversations/messages', { studentId: api.f.studentId, subjectId, body });
  const read = (who: Requests, api: Api, w: World, query = '', subjectId = w.subjectId) =>
    who.get(`/conversations/messages?studentId=${api.f.studentId}&subjectId=${subjectId}${query}`);

  describe('writing and reading', () => {
    it('is shared by the teacher and every parent of the child, in the order it happened', async () => {
      await inApi(async (api) => {
        const w = await setup(api);

        const first = await say(w.teacher, api, w, 'Ana je danas lijepo radila na času.');
        await say(w.parent, api, w, 'Hvala, kod kuće joj ide dobro.');
        await say(w.secondParent, api, w, 'I ja se pridružujem, hvala.');

        expect(first.status).toBe(201);
        expect(first.body.message).toMatchObject({
          id: expect.any(String),
          author: { id: api.f.teacherId, fullName: 'Jovan Jovanović', role: 'teacher' },
          body: 'Ana je danas lijepo radila na času.',
          student: { id: api.f.studentId, fullName: 'Ana Ivić' },
          subject: { id: w.subjectId, name: 'Biologija' },
        });
        for (const person of [w.teacher, w.parent, w.secondParent]) {
          const response = await read(person, api, w);
          expect(response.status).toBe(200);
          expect(response.body).toMatchObject({
            student: { id: api.f.studentId, fullName: 'Ana Ivić' },
            subject: { id: w.subjectId, name: 'Biologija' },
            total: 3,
          });
          expect(
            response.body.messages.map((m: { author: { role: string } }) => m.author.role),
          ).toEqual(['teacher', 'parent', 'parent']);
          expect(response.body.messages[2].author.id).toBe(w.secondParentId);
        }
      });
    });

    it('is empty before anybody writes', async () => {
      await inApi(async (api) => {
        const w = await setup(api);

        const response = await read(w.parent, api, w);

        expect(response.status).toBe(200);
        expect(response.body.messages).toEqual([]);
        expect(response.body.total).toBe(0);
      });
    });

    it('keeps line breaks but not the space around a message', async () => {
      await inApi(async (api) => {
        const w = await setup(api);

        const response = await say(w.parent, api, w, '\n  Dobar dan,\r\nzanima me domaći.  \n');

        expect(response.body.message.body).toBe('Dobar dan,\nzanima me domaći.');
      });
    });

    it.each([
      ['no text', undefined],
      ['only spaces', '  \n '],
      ['something that is not text', 12],
      ['1001 characters', 'a'.repeat(1001)],
    ])('refuses a message with %s', async (_name, body) => {
      await inApi(async (api) => {
        const w = await setup(api);

        const response = await say(w.parent, api, w, body);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('invalid_message');
        expect((await read(w.parent, api, w)).body.total).toBe(0);
      });
    });

    it('accepts a message of exactly 1000 characters', async () => {
      await inApi(async (api) => {
        const w = await setup(api);

        expect((await say(w.parent, api, w, 'a'.repeat(1000))).status).toBe(201);
      });
    });

    it('shows the newest messages when there are many, still oldest first', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        for (const text of ['prva', 'druga', 'treća', 'četvrta']) {
          await say(w.parent, api, w, text);
        }

        const response = await read(w.parent, api, w, '&limit=2');

        expect(response.body.total).toBe(4);
        expect(response.body.messages.map((m: { body: string }) => m.body)).toEqual([
          'treća',
          'četvrta',
        ]);
        expect((await read(w.parent, api, w, '&limit=0')).status).toBe(400);
      });
    });

    it('needs the student and the subject', async () => {
      await inApi(async (api) => {
        const w = await setup(api);

        expect((await w.parent.get('/conversations/messages')).body.error.code).toBe(
          'invalid_student',
        );
        const noSubject = await w.parent.get(
          `/conversations/messages?studentId=${api.f.studentId}`,
        );
        expect(noSubject.body.error.code).toBe('invalid_subject');
        const post = await w.parent.post('/conversations/messages', { body: 'x' });
        expect(post.status).toBe(400);
      });
    });
  });

  describe('who may take part', () => {
    it('is only the teacher of the subject and the parents of a student who joined it', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        await say(w.teacher, api, w, 'Poruka');

        // A parent of somebody else's child.
        expect((await read(w.strangerParent, api, w)).status).toBe(403);
        expect((await say(w.strangerParent, api, w, 'Hej')).status).toBe(403);
        // A teacher of another subject.
        expect((await read(w.otherTeacher, api, w)).status).toBe(404);
        expect((await say(w.otherTeacher, api, w, 'Hej')).status).toBe(404);
        // The child, and the admin.
        for (const person of [w.student, api]) {
          expect((await read(person, api, w)).status).toBe(403);
          expect((await say(person, api, w, 'Hej')).status).toBe(403);
        }
        expect((await read(w.parent, api, w)).body.total).toBe(1);
      });
    });

    it('needs the student to have joined the subject', async () => {
      await inApi(async (api) => {
        const w = await setup(api);

        // The parent's child has not joined this subject, and the teacher teaches it.
        expect((await read(w.parent, api, w, '', w.otherSubjectId)).status).toBe(404);
        expect((await say(w.otherTeacher, api, w, 'Hej', w.otherSubjectId)).status).toBe(404);
        await api.client.query('DELETE FROM enrollments');
        expect((await read(w.teacher, api, w)).status).toBe(404);
        expect((await say(w.parent, api, w, 'Hej')).status).toBe(404);
      });
    });

    it('is not open to a request for a subject that is still waiting for a decision', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        await api.client.query('DELETE FROM enrollments');
        await insertEnrollment(api.client, {
          schoolId: api.f.schoolId,
          studentId: api.f.studentId,
          subjectId: w.subjectId,
          requestedBy: api.f.studentId,
          requestedByRole: 'student',
          status: 'awaiting_parent',
        });

        expect((await say(w.teacher, api, w, 'Hej')).status).toBe(404);
      });
    });
  });

  describe('the inbox', () => {
    it('lists the conversations that have messages, the newest first', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        await insertEnrollment(api.client, {
          schoolId: api.f.schoolId,
          studentId: api.f.studentId,
          subjectId: w.otherSubjectId,
          requestedBy: api.f.studentId,
          requestedByRole: 'student',
          status: 'approved',
          parentDecidedBy: api.f.parentId,
          teacherDecidedBy: api.f.teacherId,
        });
        await say(w.parent, api, w, 'Biologija 1');
        await say(w.parent, api, w, 'Fizika 1', w.otherSubjectId);
        await say(w.teacher, api, w, 'Biologija 2');

        const parent = await w.parent.get('/conversations');
        expect(parent.status).toBe(200);
        expect(parent.body.conversations).toHaveLength(2);
        expect(parent.body.conversations[0]).toMatchObject({
          student: { id: api.f.studentId, fullName: 'Ana Ivić' },
          subject: { id: w.subjectId, name: 'Biologija' },
          messageCount: 2,
          lastMessage: { body: 'Biologija 2', author: { role: 'teacher' } },
        });
        expect(parent.body.conversations[1].subject.name).toBe('Fizika');

        // Each teacher sees only the conversations of their own subject.
        const teacher = await w.teacher.get('/conversations');
        expect(
          teacher.body.conversations.map((c: { subject: { name: string } }) => c.subject.name),
        ).toEqual(['Biologija']);
        const other = await w.otherTeacher.get('/conversations');
        expect(
          other.body.conversations.map((c: { subject: { name: string } }) => c.subject.name),
        ).toEqual(['Fizika']);
        expect((await w.secondParent.get('/conversations')).body.conversations).toHaveLength(2);
      });
    });

    it('is empty for a parent without children and for a teacher without messages', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        await say(w.parent, api, w, 'Hej');

        expect((await w.strangerParent.get('/conversations')).body.conversations).toEqual([]);
        expect((await w.otherTeacher.get('/conversations')).body.conversations).toEqual([]);
      });
    });

    it('is only for parents and teachers', async () => {
      await inApi(async (api) => {
        const w = await setup(api);

        expect((await api.get('/conversations')).status).toBe(403);
        expect((await w.student.get('/conversations')).status).toBe(403);
      });
    });
  });

  describe('when somebody is deleted', () => {
    it('the conversations about a deleted student are deleted too', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        await say(w.parent, api, w, 'Hej');
        await say(w.teacher, api, w, 'Dobar dan');
        await api.deactivate(api.f.studentId);

        expect((await api.post('/users/delete', { ids: [api.f.studentId] })).status).toBe(200);

        const { rows } = await api.client.query('SELECT 1 FROM conversation_messages');
        expect(rows).toHaveLength(0);
      });
    });

    it('the messages of a deleted parent are deleted, those of the others stay', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        await say(w.parent, api, w, 'Od prvog roditelja');
        await say(w.secondParent, api, w, 'Od drugog roditelja');
        await api.deactivate(api.f.parentId);

        expect((await api.post('/users/delete', { ids: [api.f.parentId] })).status).toBe(200);

        const response = await read(w.secondParent, api, w);
        expect(response.body.messages.map((m: { body: string }) => m.body)).toEqual([
          'Od drugog roditelja',
        ]);
      });
    });
  });
});

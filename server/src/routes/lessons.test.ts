import type pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPool } from '../db/pool.ts';
import {
  insertActivatedUser,
  insertClass,
  insertEnrollment,
  insertLesson,
  insertParentStudent,
  insertQuiz,
  insertSubject,
  insertSummary,
  insertUser,
} from '../db/testUtils.ts';
import { inApi as runWithApi, PASSWORD, type Api, type Requests } from './testApi.ts';

const UNKNOWN = '00000000-0000-0000-0000-000000000000';
const BODY = 'Biljke prave hranu uz pomoć svjetlosti.\nZa to trebaju voda i ugljen-dioksid.';

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('lessons', () => {
  // Created in beforeAll because describe bodies run even when the suite is skipped.
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  const inApi = (run: (api: Api) => Promise<void>) => runWithApi(pool, run);

  interface World {
    classId: string;
    mathId: string;
    // Taught by a second teacher, Mira.
    physicsId: string;
    teacher: Requests;
    otherTeacher: Requests;
    // Ana: joined Matematika. Petar is her parent.
    student: Requests;
    parent: Requests;
    // Sam: a student who joined nothing.
    outsider: Requests;
    miraId: string;
  }

  async function setup(api: Api): Promise<World> {
    const { client, f } = api;
    const miraId = await insertActivatedUser(client, f.schoolId, 'teacher', {
      username: 'mira_miric',
      email: 'mira@example.com',
      password: PASSWORD,
      fullName: 'Mira Mirić',
    });
    await insertActivatedUser(client, f.schoolId, 'student', {
      username: 'sam_ucenik',
      email: 'sam@example.com',
      password: PASSWORD,
    });
    const classId = await insertClass(client, f.schoolId, '5-2', 2026);
    const mathId = await insertSubject(client, f.schoolId, classId, f.teacherId, 'Matematika');
    const physicsId = await insertSubject(client, f.schoolId, classId, miraId, 'Fizika');
    await insertParentStudent(client, f.schoolId, f.parentId, f.studentId, f.adminId);
    await insertEnrollment(client, {
      schoolId: f.schoolId,
      studentId: f.studentId,
      subjectId: mathId,
      requestedBy: f.studentId,
      requestedByRole: 'student',
      status: 'approved',
      parentDecidedBy: f.parentId,
      teacherDecidedBy: f.teacherId,
    });

    return {
      classId,
      mathId,
      physicsId,
      miraId,
      teacher: await api.as('jovan_jovanovic'),
      otherTeacher: await api.as('mira_miric'),
      student: await api.as('ana_ivic'),
      parent: await api.as('petar_ivic'),
      outsider: await api.as('sam_ucenik'),
    };
  }

  const lessonIn = (api: Api, subjectId: string, fields: object = {}) =>
    insertLesson(api.client, {
      schoolId: api.f.schoolId,
      subjectId,
      createdBy: api.f.teacherId,
      ...fields,
    });

  const publishedAt = () => new Date().toISOString();

  const ids = (response: request.Response) =>
    (response.body.lessons as { id: string }[]).map((lesson) => lesson.id);

  describe('POST /lessons', () => {
    it('lets a teacher write a lesson for a subject they teach, as a draft', async () => {
      await inApi(async (api) => {
        const w = await setup(api);

        const response = await w.teacher.post('/lessons', {
          subjectId: w.mathId,
          title: 'Fotosinteza',
          body: BODY,
        });

        expect(response.status).toBe(201);
        expect(response.body.lesson).toEqual({
          id: expect.any(String),
          title: 'Fotosinteza',
          status: 'draft',
          body: BODY,
          source: 'pasted',
          sourceFileName: null,
          bodyRevision: 1,
          processingError: null,
          summary: null,
          quiz: null,
          subject: {
            id: w.mathId,
            name: 'Matematika',
            className: '5-2',
            schoolYear: 2026,
            teacher: { id: api.f.teacherId, fullName: 'Jovan Jovanović' },
          },
          publishedAt: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
      });
    });

    it('can start with a title only, and the text comes later', async () => {
      await inApi(async (api) => {
        const w = await setup(api);

        const response = await w.teacher.post('/lessons', { subjectId: w.mathId, title: 'Nova' });

        expect(response.status).toBe(201);
        expect(response.body.lesson.body).toBe('');
      });
    });

    it('tidies the title and keeps the line breaks of the text', async () => {
      await inApi(async (api) => {
        const w = await setup(api);

        const response = await w.teacher.post('/lessons', {
          subjectId: w.mathId,
          title: '  Fotosinteza   biljaka ',
          body: 'Prvi red\r\n\r\nDrugi red\rTreći red',
        });

        expect(response.body.lesson.title).toBe('Fotosinteza biljaka');
        expect(response.body.lesson.body).toBe('Prvi red\n\nDrugi red\nTreći red');
      });
    });

    it('accepts a text of exactly 40,000 characters and refuses one character more', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const create = (body: string) =>
          w.teacher.post('/lessons', { subjectId: w.mathId, title: 'Dugo', body });

        expect((await create('č'.repeat(40_000))).status).toBe(201);
        const tooLong = await create('č'.repeat(40_001));
        expect(tooLong.status).toBe(400);
        expect(tooLong.body.error.code).toBe('invalid_body');
      });
    });

    it.each([
      ['no title', {}],
      ['an empty title', { title: '' }],
      ['a blank title', { title: '   ' }],
      ['a title above 200 characters', { title: 'x'.repeat(201) }],
      ['a title that is not text', { title: 5 }],
    ])('answers 400 for %s', async (_name, change) => {
      await inApi(async (api) => {
        const w = await setup(api);

        const response = await w.teacher.post('/lessons', { subjectId: w.mathId, ...change });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('invalid_title');
      });
    });

    it('answers 400 for a text that is not text', async () => {
      await inApi(async (api) => {
        const w = await setup(api);

        const response = await w.teacher.post('/lessons', {
          subjectId: w.mathId,
          title: 'Naslov',
          body: 12345,
        });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('invalid_body');
      });
    });

    it('refuses a subject the teacher does not teach, from another school, unknown or missing', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const { client, f } = api;
        const otherTeacher = await insertUser(client, f.otherSchoolId, 'teacher');
        const otherClass = await insertClass(client, f.otherSchoolId, '5-2', 2026);
        const otherSchoolSubject = await insertSubject(
          client,
          f.otherSchoolId,
          otherClass,
          otherTeacher,
        );

        for (const subjectId of [w.physicsId, otherSchoolSubject, UNKNOWN, 'nope', 5, undefined]) {
          const response = await w.teacher.post('/lessons', { subjectId, title: 'Naslov' });

          expect(response.status).toBe(400);
          expect(response.body.error.code).toBe('invalid_subject');
        }
        const { rows } = await client.query('SELECT 1 FROM lessons');
        expect(rows).toHaveLength(0);
      });
    });

    it('refuses a text with the NUL character', async () => {
      await inApi(async (api) => {
        const w = await setup(api);

        const response = await w.teacher.post('/lessons', {
          subjectId: w.mathId,
          title: 'Naslov',
          body: 'tekst\u0000tekst',
        });

        expect(response.status).toBe(400);
      });
    });

    it('answers 401 when nobody is signed in and 403 for students, parents and admins', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const body = { subjectId: w.mathId, title: 'Naslov' };

        expect((await request(api.app).post('/lessons').send(body)).status).toBe(401);
        expect((await w.student.post('/lessons', body)).status).toBe(403);
        expect((await w.parent.post('/lessons', body)).status).toBe(403);
        expect((await api.post('/lessons', body)).status).toBe(403);
      });
    });
  });

  describe('GET /lessons', () => {
    it('shows a teacher the lessons of their subjects in every state, not of other subjects', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const draft = await lessonIn(api, w.mathId, { title: 'Nacrt' });
        const review = await lessonIn(api, w.mathId, { title: 'Pregled', status: 'in_review' });
        const live = await lessonIn(api, w.mathId, {
          title: 'Objavljeno',
          status: 'published',
          publishedAt: publishedAt(),
        });
        await lessonIn(api, w.physicsId, { title: 'Tuđa lekcija' });

        const response = await w.teacher.get('/lessons');

        expect(response.status).toBe(200);
        expect(response.body.total).toBe(3);
        expect(ids(response).sort()).toEqual([draft, review, live].sort());
      });
    });

    it('describes each lesson briefly, without its text', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        await lessonIn(api, w.mathId, { title: 'Nacrt' });

        const { lessons } = (await w.teacher.get('/lessons')).body;

        expect(lessons[0]).toEqual({
          id: expect.any(String),
          title: 'Nacrt',
          status: 'draft',
          subject: { id: w.mathId, name: 'Matematika', className: '5-2', schoolYear: 2026 },
          publishedAt: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
      });
    });

    it('filters by subject and status, and splits the list into pages', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const secondMath = await insertSubject(
          api.client,
          api.f.schoolId,
          w.classId,
          api.f.teacherId,
          'Fizika 2',
        );
        const draft = await lessonIn(api, w.mathId, { title: 'A' });
        await lessonIn(api, w.mathId, { title: 'B', status: 'in_review' });
        const other = await lessonIn(api, secondMath, { title: 'C' });

        expect(ids(await w.teacher.get(`/lessons?subjectId=${secondMath}`))).toEqual([other]);
        expect(ids(await w.teacher.get(`/lessons?subjectId=${w.mathId}&status=draft`))).toEqual([
          draft,
        ]);
        const first = await w.teacher.get('/lessons?limit=2&offset=0');
        const second = await w.teacher.get('/lessons?limit=2&offset=2');
        expect([first.body.lessons.length, second.body.lessons.length]).toEqual([2, 1]);
        expect([first.body.total, second.body.total]).toEqual([3, 3]);
      });
    });

    it('shows a student only published lessons of the subjects they joined', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const live = await lessonIn(api, w.mathId, {
          status: 'published',
          publishedAt: publishedAt(),
        });
        await lessonIn(api, w.mathId, { title: 'Nacrt' });
        await lessonIn(api, w.mathId, { title: 'Pregled', status: 'in_review' });
        await lessonIn(api, w.physicsId, { status: 'published', publishedAt: publishedAt() });

        const response = await w.student.get('/lessons');

        expect(ids(response)).toEqual([live]);
        expect(response.body.total).toBe(1);
      });
    });

    it('shows nothing for a subject whose enrollment was not approved', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const { client, f } = api;
        await lessonIn(api, w.physicsId, { status: 'published', publishedAt: publishedAt() });
        for (const status of ['awaiting_parent', 'awaiting_teacher', 'rejected'] as const) {
          // A rejected or waiting request does not give access; only one request per
          // subject is live, so a different subject is used for each state.
          const subject = await insertSubject(
            client,
            f.schoolId,
            w.classId,
            w.miraId,
            `Predmet ${status}`,
          );
          await lessonIn(api, subject, { status: 'published', publishedAt: publishedAt() });
          await insertEnrollment(client, {
            schoolId: f.schoolId,
            studentId: f.studentId,
            subjectId: subject,
            requestedBy: f.studentId,
            requestedByRole: 'student',
            status,
            parentDecidedBy: status === 'awaiting_parent' ? undefined : f.parentId,
          });
        }

        const response = await w.student.get('/lessons');

        expect(response.body.total).toBe(0);
      });
    });

    it('shows a student who joined nothing no lessons', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        await lessonIn(api, w.mathId, { status: 'published', publishedAt: publishedAt() });

        expect((await w.outsider.get('/lessons')).body).toEqual({ lessons: [], total: 0 });
      });
    });

    it('shows a parent the published lessons of the subjects their children joined', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const live = await lessonIn(api, w.mathId, {
          status: 'published',
          publishedAt: publishedAt(),
        });
        await lessonIn(api, w.mathId, { title: 'Nacrt' });
        await lessonIn(api, w.physicsId, { status: 'published', publishedAt: publishedAt() });

        const response = await w.parent.get('/lessons');
        const narrowed = await w.parent.get(`/lessons?studentId=${api.f.studentId}`);

        expect(ids(response)).toEqual([live]);
        expect(ids(narrowed)).toEqual([live]);
      });
    });

    it("does not show a parent lessons of somebody else's child, and refuses to narrow to one", async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        await lessonIn(api, w.mathId, { status: 'published', publishedAt: publishedAt() });
        const { client, f } = api;
        await insertActivatedUser(client, f.schoolId, 'parent', {
          username: 'tudji_roditelj',
          email: 'tudji@example.com',
          password: PASSWORD,
        });
        const stranger = await api.as('tudji_roditelj');

        expect((await stranger.get('/lessons')).body.total).toBe(0);
        expect((await stranger.get(`/lessons?studentId=${f.studentId}`)).status).toBe(403);
      });
    });

    it('never shows lessons of another school', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const { client, f } = api;
        const otherTeacher = await insertUser(client, f.otherSchoolId, 'teacher');
        const otherClass = await insertClass(client, f.otherSchoolId, '5-2', 2026);
        const otherSubject = await insertSubject(client, f.otherSchoolId, otherClass, otherTeacher);
        await insertLesson(client, {
          schoolId: f.otherSchoolId,
          subjectId: otherSubject,
          createdBy: otherTeacher,
        });

        expect((await w.teacher.get('/lessons')).body.total).toBe(0);
      });
    });

    it.each([
      ['an unknown status', 'status=maybe'],
      ['a subject id that is not a uuid', 'subjectId=abc'],
      ['a student id that is not a uuid', 'studentId=abc'],
      ['a limit above 200', 'limit=201'],
    ])('answers 400 for %s', async (_name, query) => {
      await inApi(async (api) => {
        const w = await setup(api);

        const response = await w.teacher.get(`/lessons?${query}`);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('invalid_request');
      });
    });

    it('answers 401 when nobody is signed in and 403 for admins', async () => {
      await inApi(async (api) => {
        expect((await request(api.app).get('/lessons')).status).toBe(401);
        expect((await api.get('/lessons')).status).toBe(403);
      });
    });
  });

  describe('GET /lessons/:id', () => {
    it('shows a teacher the whole lesson of their subject in any state', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w.mathId, { title: 'Nacrt', body: BODY });

        const response = await w.teacher.get(`/lessons/${id}`);

        expect(response.status).toBe(200);
        expect(response.body.lesson).toMatchObject({
          id,
          title: 'Nacrt',
          body: BODY,
          status: 'draft',
        });
      });
    });

    it('shows a student a published lesson of a subject they joined', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w.mathId, {
          body: BODY,
          status: 'published',
          publishedAt: publishedAt(),
        });

        const response = await w.student.get(`/lessons/${id}`);

        expect(response.status).toBe(200);
        expect(response.body.lesson.body).toBe(BODY);
      });
    });

    it('shows a parent the lesson their child can read', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w.mathId, {
          status: 'published',
          publishedAt: publishedAt(),
        });

        expect((await w.parent.get(`/lessons/${id}`)).status).toBe(200);
      });
    });

    it('answers 404, as if it did not exist, to everybody who may not see it', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const { client, f } = api;
        const draft = await lessonIn(api, w.mathId, { title: 'Nacrt' });
        const live = await lessonIn(api, w.mathId, {
          status: 'published',
          publishedAt: publishedAt(),
        });
        const physics = await lessonIn(api, w.physicsId, {
          status: 'published',
          publishedAt: publishedAt(),
        });
        const otherTeacher = await insertUser(client, f.otherSchoolId, 'teacher');
        const otherClass = await insertClass(client, f.otherSchoolId, '5-2', 2026);
        const otherSubject = await insertSubject(client, f.otherSchoolId, otherClass, otherTeacher);
        const otherSchoolLesson = await insertLesson(client, {
          schoolId: f.otherSchoolId,
          subjectId: otherSubject,
          createdBy: otherTeacher,
        });

        const notVisible: [Requests, string][] = [
          [w.student, draft], // not published yet
          [w.parent, draft],
          [w.outsider, live], // did not join the subject
          [w.student, physics], // another subject
          [w.otherTeacher, draft], // another teacher's subject
          [w.teacher, physics],
          [w.teacher, otherSchoolLesson], // another school
          [w.student, UNKNOWN],
          [w.student, 'nope'],
        ];
        for (const [person, id] of notVisible) {
          expect((await person.get(`/lessons/${id}`)).status).toBe(404);
        }
      });
    });

    it('answers 401 when nobody is signed in and 403 for admins', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w.mathId);

        expect((await request(api.app).get(`/lessons/${id}`)).status).toBe(401);
        expect((await api.get(`/lessons/${id}`)).status).toBe(403);
      });
    });
  });

  describe('PATCH /lessons/:id', () => {
    it('changes the title without touching the revision of the text', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w.mathId, { body: BODY });

        const response = await w.teacher.patch(`/lessons/${id}`, { title: ' Novi naslov ' });

        expect(response.status).toBe(200);
        expect(response.body.lesson).toMatchObject({
          title: 'Novi naslov',
          body: BODY,
          bodyRevision: 1,
        });
      });
    });

    it('raises the revision when the text really changes, and only then', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w.mathId, { body: BODY });

        const same = await w.teacher.patch(`/lessons/${id}`, { body: BODY });
        const changed = await w.teacher.patch(`/lessons/${id}`, { body: `${BODY}\nNovi red.` });
        const again = await w.teacher.patch(`/lessons/${id}`, { body: `${BODY}\nNovi red.` });

        expect(same.body.lesson.bodyRevision).toBe(1);
        expect(changed.body.lesson.bodyRevision).toBe(2);
        expect(again.body.lesson.bodyRevision).toBe(2);
      });
    });

    it('can empty the text', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w.mathId, { body: BODY });

        const response = await w.teacher.patch(`/lessons/${id}`, { body: '' });

        expect(response.body.lesson.body).toBe('');
        expect(response.body.lesson.bodyRevision).toBe(2);
      });
    });

    it('works while the lesson is in review', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w.mathId, { status: 'in_review' });

        expect((await w.teacher.patch(`/lessons/${id}`, { title: 'Novo' })).status).toBe(200);
      });
    });

    it('refuses to change a published lesson, until it is taken back', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w.mathId, {
          status: 'published',
          publishedAt: publishedAt(),
        });

        const response = await w.teacher.patch(`/lessons/${id}`, { title: 'Novo' });

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe('lesson_published');
      });
    });

    it('refuses to change a lesson while it is being processed', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w.mathId, { status: 'processing' });

        const response = await w.teacher.patch(`/lessons/${id}`, { title: 'Novo' });

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe('lesson_busy');
      });
    });

    it.each([
      ['nothing', {}, 'invalid_request'],
      ['a blank title', { title: '  ' }, 'invalid_title'],
      ['a title above 200 characters', { title: 'x'.repeat(201) }, 'invalid_title'],
      ['a text above 40,000 characters', { body: 'x'.repeat(40_001) }, 'invalid_body'],
      ['a text that is not text', { body: 7 }, 'invalid_body'],
    ])('answers 400 for %s', async (_name, change, code) => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w.mathId);

        const response = await w.teacher.patch(`/lessons/${id}`, change);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe(code);
      });
    });

    it("answers 404 for another teacher's lesson, an unknown one and a bad id", async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w.mathId, { title: 'Moja' });

        for (const lessonId of [id, UNKNOWN, 'nope']) {
          expect(
            (await w.otherTeacher.patch(`/lessons/${lessonId}`, { title: 'Tuđa' })).status,
          ).toBe(404);
        }
        expect((await w.teacher.get(`/lessons/${id}`)).body.lesson.title).toBe('Moja');
      });
    });

    it('answers 403 for students, parents and admins', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w.mathId);

        for (const person of [w.student, w.parent, api]) {
          expect((await person.patch(`/lessons/${id}`, { title: 'Novo' })).status).toBe(403);
        }
      });
    });
  });

  describe('DELETE /lessons/:id', () => {
    it('deletes a draft', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w.mathId);

        expect((await w.teacher.delete(`/lessons/${id}`)).status).toBe(204);
        expect((await w.teacher.get(`/lessons/${id}`)).status).toBe(404);
      });
    });

    it('refuses to delete a published lesson or one being processed', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const live = await lessonIn(api, w.mathId, {
          status: 'published',
          publishedAt: publishedAt(),
        });
        const busy = await lessonIn(api, w.mathId, { status: 'processing' });

        expect((await w.teacher.delete(`/lessons/${live}`)).body.error.code).toBe(
          'lesson_published',
        );
        expect((await w.teacher.delete(`/lessons/${busy}`)).body.error.code).toBe('lesson_busy');
        expect((await w.teacher.get('/lessons')).body.total).toBe(2);
      });
    });

    it("answers 404 for another teacher's lesson and 403 for others", async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w.mathId);

        expect((await w.otherTeacher.delete(`/lessons/${id}`)).status).toBe(404);
        expect((await w.student.delete(`/lessons/${id}`)).status).toBe(403);
        expect((await api.delete(`/lessons/${id}`)).status).toBe(403);
        expect((await w.teacher.get(`/lessons/${id}`)).status).toBe(200);
      });
    });
  });

  describe('publishing', () => {
    it('makes a draft with text visible to the students who joined the subject', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w.mathId, { body: BODY });
        expect((await w.student.get(`/lessons/${id}`)).status).toBe(404);

        const response = await w.teacher.post(`/lessons/${id}/publish`);

        expect(response.status).toBe(200);
        expect(response.body.lesson).toMatchObject({
          status: 'published',
          publishedAt: expect.any(String),
        });
        expect((await w.student.get(`/lessons/${id}`)).status).toBe(200);
        expect((await w.parent.get(`/lessons/${id}`)).status).toBe(200);
        expect((await w.outsider.get(`/lessons/${id}`)).status).toBe(404);
      });
    });

    it('can publish a lesson that is in review', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w.mathId, { body: BODY, status: 'in_review' });

        expect((await w.teacher.post(`/lessons/${id}/publish`)).status).toBe(200);
      });
    });

    it.each(['', '   ', '\n\n'])('refuses a lesson with no real text (%j)', async (body) => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w.mathId, { body });

        const response = await w.teacher.post(`/lessons/${id}/publish`);

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe('lesson_has_no_text');
      });
    });

    it('refuses a lesson that is being processed or already published', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const busy = await lessonIn(api, w.mathId, { body: BODY, status: 'processing' });
        const live = await lessonIn(api, w.mathId, {
          body: BODY,
          status: 'published',
          publishedAt: publishedAt(),
        });

        expect((await w.teacher.post(`/lessons/${busy}/publish`)).body.error.code).toBe(
          'lesson_busy',
        );
        expect((await w.teacher.post(`/lessons/${live}/publish`)).body.error.code).toBe(
          'wrong_state',
        );
      });
    });

    it('refuses a summary or a quiz that has not been approved yet', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const withSummary = await lessonIn(api, w.mathId, { body: BODY });
        const withQuiz = await lessonIn(api, w.mathId, { body: BODY });
        await insertSummary(api.client, { schoolId: api.f.schoolId, lessonId: withSummary });
        await insertQuiz(api.client, { schoolId: api.f.schoolId, lessonId: withQuiz });

        for (const id of [withSummary, withQuiz]) {
          const response = await w.teacher.post(`/lessons/${id}/publish`);

          expect(response.status).toBe(409);
          expect(response.body.error.code).toBe('needs_approval');
        }
      });
    });

    it('publishes a lesson whose summary and quiz are approved and up to date', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const { f } = api;
        const id = await lessonIn(api, w.mathId, { body: BODY });
        const approved = {
          schoolId: f.schoolId,
          lessonId: id,
          status: 'approved' as const,
          approvedBy: f.teacherId,
          approvedAt: publishedAt(),
        };
        await insertSummary(api.client, approved);
        await insertQuiz(api.client, approved);

        expect((await w.teacher.post(`/lessons/${id}/publish`)).status).toBe(200);
      });
    });

    it('refuses a summary or a quiz made from an older text, even if it was approved', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const { f } = api;
        const id = await lessonIn(api, w.mathId, { body: BODY });
        await insertSummary(api.client, {
          schoolId: f.schoolId,
          lessonId: id,
          status: 'approved',
          approvedBy: f.teacherId,
          approvedAt: publishedAt(),
        });
        // The text changes after the summary was approved.
        await w.teacher.patch(`/lessons/${id}`, { body: `${BODY}\nNovi red.` });

        const response = await w.teacher.post(`/lessons/${id}/publish`);

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe('content_outdated');
      });
    });

    it("answers 404 for another teacher's lesson and 403 for others", async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w.mathId, { body: BODY });

        expect((await w.otherTeacher.post(`/lessons/${id}/publish`)).status).toBe(404);
        expect((await w.student.post(`/lessons/${id}/publish`)).status).toBe(403);
        expect((await api.post(`/lessons/${id}/publish`)).status).toBe(403);
      });
    });
  });

  describe('taking a lesson back', () => {
    it('hides it from students and allows changes again', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w.mathId, {
          body: BODY,
          status: 'published',
          publishedAt: publishedAt(),
        });

        const response = await w.teacher.post(`/lessons/${id}/unpublish`);

        expect(response.status).toBe(200);
        expect(response.body.lesson).toMatchObject({ status: 'draft', publishedAt: null });
        expect((await w.student.get(`/lessons/${id}`)).status).toBe(404);
        expect((await w.teacher.patch(`/lessons/${id}`, { title: 'Ispravljeno' })).status).toBe(
          200,
        );
        expect((await w.teacher.post(`/lessons/${id}/publish`)).status).toBe(200);
        expect((await w.student.get(`/lessons/${id}`)).status).toBe(200);
      });
    });

    it('refuses a lesson that is not published', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w.mathId);

        const response = await w.teacher.post(`/lessons/${id}/unpublish`);

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe('wrong_state');
      });
    });

    it("answers 404 for another teacher's lesson and 403 for others", async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w.mathId, {
          status: 'published',
          publishedAt: publishedAt(),
        });

        expect((await w.otherTeacher.post(`/lessons/${id}/unpublish`)).status).toBe(404);
        expect((await w.student.post(`/lessons/${id}/unpublish`)).status).toBe(403);
        expect((await w.teacher.get(`/lessons/${id}`)).body.lesson.status).toBe('published');
      });
    });
  });

  describe('when the teacher of a subject changes', () => {
    it('gives the lessons to the new teacher', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w.mathId, { body: BODY });

        const changed = await api.patch(`/subjects/${w.mathId}`, { teacherId: w.miraId });

        expect(changed.status).toBe(200);
        expect((await w.teacher.get(`/lessons/${id}`)).status).toBe(404);
        expect((await w.otherTeacher.get(`/lessons/${id}`)).status).toBe(200);
        expect((await w.otherTeacher.post(`/lessons/${id}/publish`)).status).toBe(200);
      });
    });
  });
});

import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPool } from '../db/pool.ts';
import {
  insertActivatedUser,
  insertClass,
  insertEnrollment,
  insertLesson,
  insertParentStudent,
  insertSubject,
} from '../db/testUtils.ts';
import { inApi as runWithApi, PASSWORD, type Api, type Requests } from './testApi.ts';

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('stars', () => {
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  const inApi = (run: (api: Api) => Promise<void>) => runWithApi(pool, run);

  interface World {
    subjectId: string;
    otherSubjectId: string;
    teacher: Requests;
    otherTeacher: Requests;
    student: Requests;
    parent: Requests;
    otherParent: Requests;
  }

  // Ana (a student) joined the subject of the teacher; Petar and another parent are her
  // parents. A second teacher teaches another subject that Ana has not joined.
  async function setup(api: Api): Promise<World> {
    const { client, f } = api;
    const otherTeacherId = await insertActivatedUser(client, f.schoolId, 'teacher', {
      username: 'mira_miric',
      email: 'mira@example.com',
      password: PASSWORD,
    });
    const otherParentId = await insertActivatedUser(client, f.schoolId, 'parent', {
      username: 'drugi_roditelj',
      email: 'drugi@example.com',
      password: PASSWORD,
    });
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
    await insertParentStudent(client, f.schoolId, otherParentId, f.studentId, f.adminId);
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
      teacher: await api.as('jovan_jovanovic'),
      otherTeacher: await api.as('mira_miric'),
      student: await api.as('ana_ivic'),
      parent: await api.as('petar_ivic'),
      otherParent: await api.as('drugi_roditelj'),
    };
  }

  const publishedLesson = (api: Api, w: World, title = 'Fotosinteza') =>
    insertLesson(api.client, {
      schoolId: api.f.schoolId,
      subjectId: w.subjectId,
      createdBy: api.f.teacherId,
      title,
      status: 'published',
      publishedAt: new Date().toISOString(),
    });

  const give = (w: World, api: Api, message = 'Bravo za trud na času') =>
    w.teacher.post('/stars', { studentId: api.f.studentId, subjectId: w.subjectId, message });

  describe('the automatic star for finishing a lesson', () => {
    it('is earned once for each lesson that is finished', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const first = await publishedLesson(api, w, 'Fotosinteza');
        const second = await publishedLesson(api, w, 'Disanje');

        await w.student.post(`/lessons/${first}/complete`);
        await w.student.post(`/lessons/${first}/complete`);
        await w.student.post(`/lessons/${second}/complete`);
        const response = await w.student.get('/stars');

        expect(response.status).toBe(200);
        expect(response.body.counts).toEqual({ automatic: 2, teacher: 0 });
        expect(response.body.stars).toHaveLength(2);
        // (All of a test runs in one transaction, so the stars have the same time.)
        const star = response.body.stars.find(
          (item: { lesson: { id: string } }) => item.lesson.id === second,
        );
        expect(star).toMatchObject({
          source: 'automatic',
          student: { id: api.f.studentId, fullName: 'Ana Ivić' },
          subject: { id: w.subjectId, name: 'Biologija' },
          lesson: { id: second, title: 'Disanje' },
          message: null,
          givenBy: null,
        });
      });
    });

    it('is not given when the lesson cannot be finished', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const draft = await insertLesson(api.client, {
          schoolId: api.f.schoolId,
          subjectId: w.subjectId,
          createdBy: api.f.teacherId,
        });

        expect((await w.student.post(`/lessons/${draft}/complete`)).status).toBe(404);

        expect((await w.student.get('/stars')).body.counts).toEqual({ automatic: 0, teacher: 0 });
      });
    });

    it('goes away with the lesson', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await publishedLesson(api, w);
        await w.student.post(`/lessons/${id}/complete`);
        await w.teacher.post(`/lessons/${id}/unpublish`);

        expect((await w.teacher.delete(`/lessons/${id}`)).status).toBe(204);

        expect((await w.student.get('/stars')).body.counts.automatic).toBe(0);
      });
    });

    it('cannot be taken back by the teacher', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await publishedLesson(api, w);
        await w.student.post(`/lessons/${id}/complete`);
        const star = (await w.student.get('/stars')).body.stars[0];

        expect((await w.teacher.delete(`/stars/${star.id}`)).status).toBe(404);

        expect((await w.student.get('/stars')).body.counts.automatic).toBe(1);
      });
    });
  });

  describe('a star from a teacher', () => {
    it('is given to a student of the subject, with a message', async () => {
      await inApi(async (api) => {
        const w = await setup(api);

        const response = await give(w, api, '  Bravo   za trud  ');

        expect(response.status).toBe(201);
        expect(response.body.star).toMatchObject({
          id: expect.any(String),
          source: 'teacher',
          student: { id: api.f.studentId, fullName: 'Ana Ivić' },
          subject: { id: w.subjectId, name: 'Biologija' },
          lesson: null,
          message: 'Bravo za trud',
          givenBy: { id: api.f.teacherId, fullName: 'Jovan Jovanović' },
        });
        // The same teacher can give another one.
        expect((await give(w, api)).status).toBe(201);
        expect((await w.student.get('/stars')).body.counts).toEqual({ automatic: 0, teacher: 2 });
      });
    });

    it.each([
      ['no message', {}],
      ['an empty message', { message: '   ' }],
      ['a message that is not text', { message: 5 }],
      ['a message of 201 characters', { message: 'a'.repeat(201) }],
    ])('is refused with %s', async (_name, extra) => {
      await inApi(async (api) => {
        const w = await setup(api);

        const response = await w.teacher.post('/stars', {
          studentId: api.f.studentId,
          subjectId: w.subjectId,
          ...extra,
        });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('invalid_message');
        expect((await w.student.get('/stars')).body.counts.teacher).toBe(0);
      });
    });

    it('accepts a message of exactly 200 characters', async () => {
      await inApi(async (api) => {
        const w = await setup(api);

        expect((await give(w, api, 'a'.repeat(200))).status).toBe(201);
      });
    });

    it('is refused for ids that are not valid', async () => {
      await inApi(async (api) => {
        const w = await setup(api);

        const noStudent = await w.teacher.post('/stars', { subjectId: w.subjectId, message: 'x' });
        const noSubject = await w.teacher.post('/stars', {
          studentId: api.f.studentId,
          message: 'x',
        });

        expect(noStudent.body.error.code).toBe('invalid_student');
        expect(noSubject.body.error.code).toBe('invalid_subject');
      });
    });

    it('is only possible for a student who joined a subject of this teacher', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const star = (studentId: string, subjectId: string, who = w.teacher) =>
          who.post('/stars', { studentId, subjectId, message: 'Bravo' });

        // Another teacher's subject, a subject Ana has not joined, a student who has not joined,
        // a student of another school, and somebody who is not a student.
        expect((await star(api.f.studentId, w.otherSubjectId)).status).toBe(404);
        expect((await star(api.f.studentId, w.subjectId, w.otherTeacher)).status).toBe(404);
        expect((await star(api.f.notActivatedStudentId, w.subjectId)).status).toBe(404);
        expect((await star(api.f.otherSchoolStudentId, w.subjectId)).status).toBe(404);
        expect((await star(api.f.parentId, w.subjectId)).status).toBe(404);
        // A request that is still waiting for a decision is not a joined subject.
        await api.client.query('DELETE FROM enrollments');
        await insertEnrollment(api.client, {
          schoolId: api.f.schoolId,
          studentId: api.f.studentId,
          subjectId: w.subjectId,
          requestedBy: api.f.studentId,
          requestedByRole: 'student',
          status: 'awaiting_parent',
        });
        expect((await star(api.f.studentId, w.subjectId)).status).toBe(404);
      });
    });

    it('is only for teachers', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const body = { studentId: api.f.studentId, subjectId: w.subjectId, message: 'Bravo' };

        for (const person of [w.student, w.parent, api]) {
          expect((await person.post('/stars', body)).status).toBe(403);
        }
      });
    });

    it('can be taken back by the teacher who gave it, and by nobody else', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const { star } = (await give(w, api)).body;

        expect((await w.otherTeacher.delete(`/stars/${star.id}`)).status).toBe(404);
        expect((await w.student.delete(`/stars/${star.id}`)).status).toBe(403);
        expect((await w.teacher.delete('/stars/nije-uuid')).status).toBe(404);
        expect((await w.teacher.delete(`/stars/${star.id}`)).status).toBe(204);
        expect((await w.teacher.delete(`/stars/${star.id}`)).status).toBe(404);

        expect((await w.student.get('/stars')).body.counts.teacher).toBe(0);
      });
    });
  });

  describe('listing', () => {
    it('shows a parent the stars of their children, with the message', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        await give(w, api, 'Bravo za trud');
        await w.student.post(`/lessons/${await publishedLesson(api, w)}/complete`);
        const childQuery = `?studentId=${api.f.studentId}`;

        for (const parent of [w.parent, w.otherParent]) {
          const response = await parent.get(`/stars${childQuery}`);
          expect(response.status).toBe(200);
          expect(response.body.counts).toEqual({ automatic: 1, teacher: 1 });
          expect(response.body.stars.map((s: { message: string | null }) => s.message)).toContain(
            'Bravo za trud',
          );
        }
        expect((await w.parent.get('/stars')).body.error.code).toBe('invalid_student');
        const stranger = `?studentId=${api.f.otherSchoolStudentId}`;
        expect((await w.parent.get(`/stars${stranger}`)).status).toBe(403);
      });
    });

    it('shows a student only their own stars', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        await give(w, api);
        const other = `?studentId=${api.f.notActivatedStudentId}`;

        expect((await w.student.get(`/stars${other}`)).status).toBe(403);
        expect((await w.student.get(`/stars?studentId=${api.f.studentId}`)).status).toBe(200);
      });
    });

    it('shows a teacher the stars of the students of their subjects only', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        await give(w, api);
        await w.student.post(`/lessons/${await publishedLesson(api, w)}/complete`);

        const own = await w.teacher.get('/stars');
        expect(own.body.counts).toEqual({ automatic: 1, teacher: 1 });
        const onlyOne = await w.teacher.get(
          `/stars?studentId=${api.f.studentId}&subjectId=${w.subjectId}`,
        );
        expect(onlyOne.body.stars).toHaveLength(2);
        const none = await w.teacher.get(`/stars?studentId=${api.f.notActivatedStudentId}`);
        expect(none.body.stars).toEqual([]);

        expect((await w.otherTeacher.get('/stars')).body).toEqual({
          stars: [],
          counts: { automatic: 0, teacher: 0 },
        });
      });
    });

    it('can be narrowed to a subject and is shown in pages', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        for (const title of ['Prva', 'Druga', 'Treća']) {
          await w.student.post(`/lessons/${await publishedLesson(api, w, title)}/complete`);
        }

        const page = await w.student.get(`/stars?limit=2&offset=1`);
        expect(page.body.stars).toHaveLength(2);
        expect(page.body.counts.automatic).toBe(3);
        const other = await w.student.get(`/stars?subjectId=${w.otherSubjectId}`);
        expect(other.body.stars).toEqual([]);
        expect((await w.student.get('/stars?subjectId=x')).status).toBe(400);
        expect((await w.student.get('/stars?limit=0')).status).toBe(400);
      });
    });

    it('is not for the admin', async () => {
      await inApi(async (api) => {
        await setup(api);

        expect((await api.get('/stars')).status).toBe(403);
      });
    });
  });

  describe('when a student is deleted', () => {
    it('their stars are deleted too', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        await give(w, api);
        await w.student.post(`/lessons/${await publishedLesson(api, w)}/complete`);
        await api.deactivate(api.f.studentId);

        expect((await api.post('/users/delete', { ids: [api.f.studentId] })).status).toBe(200);

        const { rows } = await api.client.query('SELECT 1 FROM stars');
        expect(rows).toHaveLength(0);
      });
    });
  });
});

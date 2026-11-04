import type pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPool } from '../db/pool.ts';
import {
  insertActivatedUser,
  insertClass,
  insertEnrollment,
  insertParentStudent,
  insertSubject,
  insertUser,
} from '../db/testUtils.ts';
import { inApi as runWithApi, PASSWORD, type Api } from './testApi.ts';

const NOT_ADMINS = ['ana_ivic', 'jovan_jovanovic', 'petar_ivic'];

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('subjects', () => {
  // Created in beforeAll because describe bodies run even when the suite is skipped.
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  const inApi = (run: (api: Api) => Promise<void>) => runWithApi(pool, run);

  const labels = (response: request.Response) =>
    (response.body.subjects as { name: string; className: string }[]).map(
      (subject) => `${subject.name} (${subject.className})`,
    );

  // A class of School A, plus a second teacher.
  async function setup({ client, f }: Api) {
    const classId = await insertClass(client, f.schoolId, '5-2', 2026);
    const secondTeacherId = await insertActivatedUser(client, f.schoolId, 'teacher', {
      username: 'mira_miric',
      email: 'mira@example.com',
      password: PASSWORD,
      fullName: 'Mira Mirić',
    });
    return { classId, secondTeacherId };
  }

  describe('POST /subjects', () => {
    it('creates a subject taught by a teacher in a class', async () => {
      await inApi(async (api) => {
        const { classId } = await setup(api);

        const response = await api.post('/subjects', {
          name: 'Matematika',
          classId,
          teacherId: api.f.teacherId,
        });

        expect(response.status).toBe(201);
        expect(response.body.subject).toEqual({
          id: expect.any(String),
          name: 'Matematika',
          classId,
          className: '5-2',
          schoolYear: 2026,
          teacher: {
            id: api.f.teacherId,
            fullName: 'Jovan Jovanović',
            deactivated: false,
            deleted: false,
          },
          createdAt: expect.any(String),
        });
      });
    });

    it('tidies spaces in the name', async () => {
      await inApi(async (api) => {
        const { classId } = await setup(api);

        const response = await api.post('/subjects', {
          name: '  Srpski   jezik ',
          classId,
          teacherId: api.f.teacherId,
        });

        expect(response.body.subject.name).toBe('Srpski jezik');
      });
    });

    it('allows the same name with different teachers, and for one teacher in different classes', async () => {
      await inApi(async (api) => {
        const { classId, secondTeacherId } = await setup(api);
        const otherClassId = await insertClass(api.client, api.f.schoolId, '6-1', 2026);
        const create = (teacherId: string, inClass: string) =>
          api.post('/subjects', { name: 'Matematika', classId: inClass, teacherId });

        expect((await create(api.f.teacherId, classId)).status).toBe(201);
        expect((await create(secondTeacherId, classId)).status).toBe(201);
        expect((await create(api.f.teacherId, otherClassId)).status).toBe(201);
      });
    });

    it('refuses the same subject twice for one teacher in one class, whatever the letter case', async () => {
      await inApi(async (api) => {
        const { classId } = await setup(api);
        await api.post('/subjects', { name: 'Matematika', classId, teacherId: api.f.teacherId });

        for (const name of ['Matematika', 'matematika', ' MATEMATIKA ']) {
          const response = await api.post('/subjects', {
            name,
            classId,
            teacherId: api.f.teacherId,
          });

          expect(response.status).toBe(409);
          expect(response.body.error.code).toBe('subject_exists');
        }
      });
    });

    it.each(['student', 'parent', 'admin'] as const)(
      'refuses a user with the role "%s" as the teacher',
      async (role) => {
        await inApi(async (api) => {
          const { classId } = await setup(api);
          const notATeacherId = await insertUser(api.client, api.f.schoolId, role);

          const response = await api.post('/subjects', {
            name: 'Matematika',
            classId,
            teacherId: notATeacherId,
          });

          expect(response.status).toBe(400);
          expect(response.body.error.code).toBe('invalid_teacher');
        });
      },
    );

    it('refuses a teacher of another school, a deactivated one, an erased one and unknown ones', async () => {
      await inApi(async (api) => {
        const { classId, secondTeacherId } = await setup(api);
        const otherSchoolTeacher = await insertUser(api.client, api.f.otherSchoolId, 'teacher');
        const erasedTeacher = await insertUser(api.client, api.f.schoolId, 'teacher');
        await api.deactivate(secondTeacherId, erasedTeacher);
        await api.post('/users/delete', { ids: [erasedTeacher] });

        for (const teacherId of [
          otherSchoolTeacher,
          secondTeacherId,
          erasedTeacher,
          '00000000-0000-0000-0000-000000000000',
          'not-a-uuid',
        ]) {
          const response = await api.post('/subjects', { name: 'Matematika', classId, teacherId });

          expect(response.status).toBe(400);
          expect(response.body.error.code).toBe('invalid_teacher');
        }
      });
    });

    it('refuses a class of another school and unknown classes', async () => {
      await inApi(async (api) => {
        const otherClassId = await insertClass(api.client, api.f.otherSchoolId, '5-2', 2026);

        for (const classId of [otherClassId, '00000000-0000-0000-0000-000000000000', 'nope']) {
          const response = await api.post('/subjects', {
            name: 'Matematika',
            classId,
            teacherId: api.f.teacherId,
          });

          expect(response.status).toBe(400);
          expect(response.body.error.code).toBe('invalid_class');
        }
      });
    });

    it.each([undefined, '', '   ', 'x'.repeat(101), 5])(
      'answers 400 for the name %j',
      async (name) => {
        await inApi(async (api) => {
          const { classId } = await setup(api);

          const response = await api.post('/subjects', {
            name,
            classId,
            teacherId: api.f.teacherId,
          });

          expect(response.status).toBe(400);
          expect(response.body.error.code).toBe('invalid_subject_name');
        });
      },
    );

    it('answers 401 when nobody is signed in', async () => {
      await inApi(async ({ app }) => {
        expect((await request(app).post('/subjects').send({})).status).toBe(401);
      });
    });

    it.each(NOT_ADMINS)('answers 403 for %s, who is not an admin', async (username) => {
      await inApi(async (api) => {
        const { classId } = await setup(api);

        const response = await (
          await api.as(username)
        ).post('/subjects', { name: 'Matematika', classId, teacherId: api.f.teacherId });

        expect(response.status).toBe(403);
      });
    });
  });

  describe('GET /subjects', () => {
    it('lists the subjects of the school, newest year first, then by class and name', async () => {
      await inApi(async (api) => {
        const { classId } = await setup(api);
        const { client, f } = api;
        const oldClass = await insertClass(client, f.schoolId, '9-1', 2025);
        await insertSubject(client, f.schoolId, classId, f.teacherId, 'Fizika');
        await insertSubject(client, f.schoolId, classId, f.teacherId, 'Biologija');
        await insertSubject(client, f.schoolId, oldClass, f.teacherId, 'Hemija');
        const otherTeacher = await insertUser(client, f.otherSchoolId, 'teacher');
        const otherClass = await insertClass(client, f.otherSchoolId, '5-2', 2026);
        await insertSubject(client, f.otherSchoolId, otherClass, otherTeacher, 'Tuđi predmet');

        const response = await api.get('/subjects');

        expect(response.status).toBe(200);
        expect(response.body.total).toBe(3);
        expect(labels(response)).toEqual(['Biologija (5-2)', 'Fizika (5-2)', 'Hemija (9-1)']);
      });
    });

    it('filters by class, teacher and school year', async () => {
      await inApi(async (api) => {
        const { classId, secondTeacherId } = await setup(api);
        const { client, f } = api;
        const oldClass = await insertClass(client, f.schoolId, '9-1', 2025);
        await insertSubject(client, f.schoolId, classId, f.teacherId, 'Fizika');
        await insertSubject(client, f.schoolId, classId, secondTeacherId, 'Biologija');
        await insertSubject(client, f.schoolId, oldClass, f.teacherId, 'Hemija');

        expect(labels(await api.get(`/subjects?classId=${oldClass}`))).toEqual(['Hemija (9-1)']);
        expect(labels(await api.get(`/subjects?teacherId=${secondTeacherId}`))).toEqual([
          'Biologija (5-2)',
        ]);
        expect(labels(await api.get('/subjects?schoolYear=2025'))).toEqual(['Hemija (9-1)']);
        expect(labels(await api.get(`/subjects?teacherId=${f.teacherId}&schoolYear=2026`))).toEqual(
          ['Fizika (5-2)'],
        );
      });
    });

    it('splits the list into pages and reports the total', async () => {
      await inApi(async (api) => {
        const { classId } = await setup(api);
        for (const name of ['A', 'B', 'C']) {
          await insertSubject(api.client, api.f.schoolId, classId, api.f.teacherId, name);
        }

        const first = await api.get('/subjects?limit=2&offset=0');
        const second = await api.get('/subjects?limit=2&offset=2');

        expect(labels(first)).toEqual(['A (5-2)', 'B (5-2)']);
        expect(labels(second)).toEqual(['C (5-2)']);
        expect([first.body.total, second.body.total]).toEqual([3, 3]);
      });
    });

    it('tells when the teacher has left or has been erased', async () => {
      await inApi(async (api) => {
        const { classId, secondTeacherId } = await setup(api);
        await insertSubject(api.client, api.f.schoolId, classId, api.f.teacherId, 'Fizika');
        await insertSubject(api.client, api.f.schoolId, classId, secondTeacherId, 'Biologija');
        await api.deactivate(api.f.teacherId, secondTeacherId);
        await api.post('/users/delete', { ids: [secondTeacherId] });

        const { subjects } = (await api.get('/subjects')).body;

        const flags = Object.fromEntries(
          subjects.map((s: { name: string; teacher: object }) => [s.name, s.teacher]),
        );
        expect(flags.Fizika).toMatchObject({ deactivated: true, deleted: false });
        expect(flags.Biologija).toMatchObject({ deactivated: true, deleted: true });
      });
    });

    it.each([
      ['a class id that is not a uuid', 'classId=abc'],
      ['a teacher id that is not a uuid', 'teacherId=abc'],
      ['a school year out of range', 'schoolYear=1999'],
      ['a limit above 200', 'limit=201'],
      ['a negative offset', 'offset=-1'],
    ])('answers 400 for %s', async (_name, query) => {
      await inApi(async ({ get }) => {
        const response = await get(`/subjects?${query}`);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('invalid_request');
      });
    });

    it.each(NOT_ADMINS)('answers 403 for %s, who is not an admin', async (username) => {
      await inApi(async ({ as }) => {
        expect((await (await as(username)).get('/subjects')).status).toBe(403);
      });
    });
  });

  describe('PATCH /subjects/:id', () => {
    async function withSubject(api: Api) {
      const { classId, secondTeacherId } = await setup(api);
      const subjectId = await insertSubject(
        api.client,
        api.f.schoolId,
        classId,
        api.f.teacherId,
        'Matematika',
      );
      return { classId, secondTeacherId, subjectId };
    }

    it('renames a subject', async () => {
      await inApi(async (api) => {
        const { subjectId } = await withSubject(api);

        const response = await api.patch(`/subjects/${subjectId}`, { name: ' Fizika ' });

        expect(response.status).toBe(200);
        expect(response.body.subject).toMatchObject({ id: subjectId, name: 'Fizika' });
        expect(response.body.subject.teacher.id).toBe(api.f.teacherId);
      });
    });

    it('changes the teacher', async () => {
      await inApi(async (api) => {
        const { subjectId, secondTeacherId } = await withSubject(api);

        const response = await api.patch(`/subjects/${subjectId}`, { teacherId: secondTeacherId });

        expect(response.body.subject.teacher).toMatchObject({
          id: secondTeacherId,
          fullName: 'Mira Mirić',
        });
        expect(response.body.subject.name).toBe('Matematika');
      });
    });

    it('changes the name and the teacher together', async () => {
      await inApi(async (api) => {
        const { subjectId, secondTeacherId } = await withSubject(api);

        const response = await api.patch(`/subjects/${subjectId}`, {
          name: 'Fizika',
          teacherId: secondTeacherId,
        });

        expect(response.body.subject).toMatchObject({ name: 'Fizika' });
        expect(response.body.subject.teacher.id).toBe(secondTeacherId);
      });
    });

    it('can rename a subject whose teacher has left', async () => {
      await inApi(async (api) => {
        const { subjectId } = await withSubject(api);
        await api.deactivate(api.f.teacherId);

        const response = await api.patch(`/subjects/${subjectId}`, { name: 'Fizika' });

        expect(response.status).toBe(200);
      });
    });

    it('needs a new name, a new teacher, or both', async () => {
      await inApi(async (api) => {
        const { subjectId } = await withSubject(api);

        const response = await api.patch(`/subjects/${subjectId}`, {});

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('invalid_request');
      });
    });

    it.each([undefined, '', 'x'.repeat(101), 5])('answers 400 for the name %j', async (name) => {
      await inApi(async (api) => {
        const { subjectId } = await withSubject(api);

        const response = await api.patch(`/subjects/${subjectId}`, { name, teacherId: undefined });

        expect(response.status).toBe(400);
      });
    });

    it('refuses a new teacher who is not an active teacher of this school', async () => {
      await inApi(async (api) => {
        const { subjectId, secondTeacherId } = await withSubject(api);
        const student = await insertUser(api.client, api.f.schoolId, 'student');
        const otherSchoolTeacher = await insertUser(api.client, api.f.otherSchoolId, 'teacher');
        await api.deactivate(secondTeacherId);

        for (const teacherId of [student, otherSchoolTeacher, secondTeacherId, 'not-a-uuid']) {
          const response = await api.patch(`/subjects/${subjectId}`, { teacherId });

          expect(response.status).toBe(400);
          expect(response.body.error.code).toBe('invalid_teacher');
        }
      });
    });

    it('refuses a change that would repeat an existing subject', async () => {
      await inApi(async (api) => {
        const { classId, subjectId, secondTeacherId } = await withSubject(api);
        await insertSubject(api.client, api.f.schoolId, classId, secondTeacherId, 'Matematika');

        const response = await api.patch(`/subjects/${subjectId}`, { teacherId: secondTeacherId });

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe('subject_exists');
      });
    });

    it('accepts a change that leaves the subject as it was', async () => {
      await inApi(async (api) => {
        const { subjectId } = await withSubject(api);

        const response = await api.patch(`/subjects/${subjectId}`, {
          name: 'matematika',
          teacherId: api.f.teacherId,
        });

        expect(response.status).toBe(200);
      });
    });

    it('answers 404 for a subject of another school, an unknown subject and a bad id', async () => {
      await inApi(async (api) => {
        const otherTeacher = await insertUser(api.client, api.f.otherSchoolId, 'teacher');
        const otherClass = await insertClass(api.client, api.f.otherSchoolId, '5-2', 2026);
        const otherSubject = await insertSubject(
          api.client,
          api.f.otherSchoolId,
          otherClass,
          otherTeacher,
        );

        for (const id of [otherSubject, '00000000-0000-0000-0000-000000000000', 'nope']) {
          expect((await api.patch(`/subjects/${id}`, { name: 'Novo' })).status).toBe(404);
        }
      });
    });

    it.each(NOT_ADMINS)('answers 403 for %s, who is not an admin', async (username) => {
      await inApi(async (api) => {
        const { subjectId } = await withSubject(api);

        const response = await (
          await api.as(username)
        ).patch(`/subjects/${subjectId}`, {
          name: 'Novo',
        });

        expect(response.status).toBe(403);
      });
    });
  });

  describe('DELETE /subjects/:id', () => {
    it('deletes a subject nobody has asked to join', async () => {
      await inApi(async (api) => {
        const { classId } = await setup(api);
        const id = await insertSubject(api.client, api.f.schoolId, classId, api.f.teacherId);

        const response = await api.delete(`/subjects/${id}`);

        expect(response.status).toBe(204);
        expect((await api.get('/subjects')).body.total).toBe(0);
      });
    });

    it('refuses to delete a subject that has enrollment requests', async () => {
      await inApi(async (api) => {
        const { classId } = await setup(api);
        const { client, f } = api;
        const id = await insertSubject(client, f.schoolId, classId, f.teacherId);
        await insertParentStudent(client, f.schoolId, f.parentId, f.studentId, f.adminId);
        await insertEnrollment(client, {
          schoolId: f.schoolId,
          studentId: f.studentId,
          subjectId: id,
          requestedBy: f.studentId,
          requestedByRole: 'student',
        });

        const response = await api.delete(`/subjects/${id}`);

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe('subject_has_enrollments');
        expect((await api.get('/subjects')).body.total).toBe(1);
      });
    });

    it('answers 404 for a subject of another school, an unknown subject and a bad id', async () => {
      await inApi(async (api) => {
        const otherTeacher = await insertUser(api.client, api.f.otherSchoolId, 'teacher');
        const otherClass = await insertClass(api.client, api.f.otherSchoolId, '5-2', 2026);
        const otherSubject = await insertSubject(
          api.client,
          api.f.otherSchoolId,
          otherClass,
          otherTeacher,
        );

        for (const id of [otherSubject, '00000000-0000-0000-0000-000000000000', 'nope']) {
          expect((await api.delete(`/subjects/${id}`)).status).toBe(404);
        }
        const { rows } = await api.client.query('SELECT 1 FROM subjects WHERE id = $1', [
          otherSubject,
        ]);
        expect(rows).toHaveLength(1);
      });
    });

    it.each(NOT_ADMINS)('answers 403 for %s, who is not an admin', async (username) => {
      await inApi(async (api) => {
        const { classId } = await setup(api);
        const id = await insertSubject(api.client, api.f.schoolId, classId, api.f.teacherId);

        expect((await (await api.as(username)).delete(`/subjects/${id}`)).status).toBe(403);
      });
    });
  });
});

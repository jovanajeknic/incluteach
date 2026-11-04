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
import { currentSchoolYear } from '../school/schoolYear.ts';
import { inApi as runWithApi, PASSWORD, type Api, type Requests } from './testApi.ts';

const YEAR = currentSchoolYear();
const UNKNOWN = '00000000-0000-0000-0000-000000000000';

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('answering enrollment requests', () => {
  // Created in beforeAll because describe bodies run even when the suite is skipped.
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  const inApi = (run: (api: Api) => Promise<void>) => runWithApi(pool, run);

  interface World {
    mathId: string;
    student: Requests;
    parent: Requests;
    teacher: Requests;
  }

  // Ana (student) with her parent Petar; Jovan teaches Matematika in 5-2.
  async function setup(api: Api): Promise<World> {
    const { client, f } = api;
    const classId = await insertClass(client, f.schoolId, '5-2', YEAR);
    const mathId = await insertSubject(client, f.schoolId, classId, f.teacherId, 'Matematika');
    await insertParentStudent(client, f.schoolId, f.parentId, f.studentId, f.adminId);
    return {
      mathId,
      student: await api.as('ana_ivic'),
      parent: await api.as('petar_ivic'),
      teacher: await api.as('jovan_jovanovic'),
    };
  }

  // The student asks; the request now waits for a parent.
  async function studentAsks({ student, mathId }: World): Promise<string> {
    const response = await student.post('/enrollments', { subjectId: mathId });
    expect(response.status).toBe(201);
    return response.body.enrollment.id as string;
  }

  // The request is waiting for the teacher (the parent has confirmed).
  async function waitingForTeacher(world: World): Promise<string> {
    const id = await studentAsks(world);
    expect((await world.parent.post(`/enrollments/${id}/approve`)).status).toBe(200);
    return id;
  }

  const statusOf = async (api: Api, id: string) =>
    (
      await api.client.query<{ status: string }>('SELECT status FROM enrollments WHERE id = $1', [
        id,
      ])
    ).rows[0].status;

  describe('a parent', () => {
    it('confirms a request, which then waits for the teacher', async () => {
      await inApi(async (api) => {
        const world = await setup(api);
        const id = await studentAsks(world);

        const response = await world.parent.post(`/enrollments/${id}/approve`);

        expect(response.status).toBe(200);
        expect(response.body.enrollment).toMatchObject({
          id,
          status: 'awaiting_teacher',
          requestedBy: 'student',
          parentDecidedAt: expect.any(String),
          teacherDecidedAt: null,
        });
        const { rows } = await api.client.query<{ parent_decided_by: string }>(
          'SELECT parent_decided_by FROM enrollments WHERE id = $1',
          [id],
        );
        expect(rows[0].parent_decided_by).toBe(api.f.parentId);
      });
    });

    it('lets the teacher see the request only after it was confirmed', async () => {
      await inApi(async (api) => {
        const world = await setup(api);
        const id = await studentAsks(world);

        const before = await world.teacher.get('/enrollments');
        await world.parent.post(`/enrollments/${id}/approve`);
        const after = await world.teacher.get('/enrollments');

        expect(before.body.total).toBe(0);
        expect(after.body.enrollments.map((e: { id: string }) => e.id)).toEqual([id]);
      });
    });

    it('rejects a request, which ends it without the teacher ever seeing it', async () => {
      await inApi(async (api) => {
        const world = await setup(api);
        const id = await studentAsks(world);

        const response = await world.parent.post(`/enrollments/${id}/reject`);

        expect(response.status).toBe(200);
        expect(response.body.enrollment).toMatchObject({
          status: 'rejected',
          parentDecidedAt: expect.any(String),
          teacherDecidedAt: null,
        });
        expect((await world.teacher.get('/enrollments')).body.total).toBe(0);
      });
    });

    it('lets the student ask again after the parent rejected', async () => {
      await inApi(async (api) => {
        const world = await setup(api);
        const id = await studentAsks(world);
        await world.parent.post(`/enrollments/${id}/reject`);

        const again = await world.student.post('/enrollments', { subjectId: world.mathId });

        expect(again.status).toBe(201);
        expect(again.body.enrollment.status).toBe('awaiting_parent');
      });
    });

    it('is not needed twice: either parent of the child can answer, and only the first counts', async () => {
      await inApi(async (api) => {
        const world = await setup(api);
        const { client, f } = api;
        await insertActivatedUser(client, f.schoolId, 'parent', {
          username: 'ivan_ivic',
          email: 'ivan@example.com',
          password: PASSWORD,
        });
        const ivanId = (
          await client.query<{ id: string }>("SELECT id FROM users WHERE username = 'ivan_ivic'")
        ).rows[0].id;
        await insertParentStudent(client, f.schoolId, ivanId, f.studentId, f.adminId);
        const otherParent = await api.as('ivan_ivic');
        const id = await studentAsks(world);

        const first = await otherParent.post(`/enrollments/${id}/approve`);
        const second = await world.parent.post(`/enrollments/${id}/reject`);

        expect(first.status).toBe(200);
        expect(second.status).toBe(409);
        expect(second.body.error.code).toBe('wrong_state');
        expect(await statusOf(api, id)).toBe('awaiting_teacher');
      });
    });

    it("cannot answer for somebody else's child", async () => {
      await inApi(async (api) => {
        const world = await setup(api);
        const { client, f } = api;
        const strangerId = await insertActivatedUser(client, f.schoolId, 'parent', {
          username: 'tudji_roditelj',
          email: 'tudji@example.com',
          password: PASSWORD,
        });
        const strangerChild = await insertUser(client, f.schoolId, 'student', 'tudje_dijete');
        await insertParentStudent(client, f.schoolId, strangerId, strangerChild, f.adminId);
        const stranger = await api.as('tudji_roditelj');
        const id = await studentAsks(world);

        for (const action of ['approve', 'reject']) {
          const response = await stranger.post(`/enrollments/${id}/${action}`);

          expect(response.status).toBe(404);
          expect(response.body.error.code).toBe('not_found');
        }
        expect(await statusOf(api, id)).toBe('awaiting_parent');
      });
    });

    it('cannot answer a request that is already with the teacher or finished', async () => {
      await inApi(async (api) => {
        const world = await setup(api);
        const id = await waitingForTeacher(world);

        for (const action of ['approve', 'reject']) {
          const response = await world.parent.post(`/enrollments/${id}/${action}`);

          expect(response.status).toBe(409);
          expect(response.body.error.code).toBe('wrong_state');
        }
        expect(await statusOf(api, id)).toBe('awaiting_teacher');

        await world.teacher.post(`/enrollments/${id}/approve`);
        expect((await world.parent.post(`/enrollments/${id}/reject`)).status).toBe(409);
        expect(await statusOf(api, id)).toBe('approved');
      });
    });

    it('cannot answer a request they sent themselves, which is already confirmed', async () => {
      await inApi(async (api) => {
        const world = await setup(api);
        const sent = await world.parent.post('/enrollments', {
          subjectId: world.mathId,
          studentId: api.f.studentId,
        });

        const response = await world.parent.post(`/enrollments/${sent.body.enrollment.id}/approve`);

        expect(response.status).toBe(409);
      });
    });

    it('answers 404 for an unknown request, a bad id and a request of another school', async () => {
      await inApi(async (api) => {
        const world = await setup(api);
        const { client, f } = api;
        const otherTeacher = await insertUser(client, f.otherSchoolId, 'teacher');
        const otherClass = await insertClass(client, f.otherSchoolId, '5-2', YEAR);
        const otherSubject = await insertSubject(client, f.otherSchoolId, otherClass, otherTeacher);
        const otherAdmin = await insertUser(client, f.otherSchoolId, 'admin');
        const otherParent = await insertUser(client, f.otherSchoolId, 'parent');
        await insertParentStudent(
          client,
          f.otherSchoolId,
          otherParent,
          f.otherSchoolStudentId,
          otherAdmin,
        );
        const otherRequest = await insertEnrollment(client, {
          schoolId: f.otherSchoolId,
          studentId: f.otherSchoolStudentId,
          subjectId: otherSubject,
          requestedBy: f.otherSchoolStudentId,
          requestedByRole: 'student',
        });

        for (const id of [UNKNOWN, 'nope', otherRequest]) {
          expect((await world.parent.post(`/enrollments/${id}/approve`)).status).toBe(404);
        }
        expect(await statusOf(api, otherRequest)).toBe('awaiting_parent');
      });
    });
  });

  describe('a teacher', () => {
    it('approves a request, which enrols the student', async () => {
      await inApi(async (api) => {
        const world = await setup(api);
        const id = await waitingForTeacher(world);

        const response = await world.teacher.post(`/enrollments/${id}/approve`);

        expect(response.status).toBe(200);
        expect(response.body.enrollment).toMatchObject({
          id,
          status: 'approved',
          parentDecidedAt: expect.any(String),
          teacherDecidedAt: expect.any(String),
        });
        const { rows } = await api.client.query<{ teacher_decided_by: string }>(
          'SELECT teacher_decided_by FROM enrollments WHERE id = $1',
          [id],
        );
        expect(rows[0].teacher_decided_by).toBe(api.f.teacherId);
      });
    });

    it('shows the student and the parent that the request was approved', async () => {
      await inApi(async (api) => {
        const world = await setup(api);
        const id = await waitingForTeacher(world);

        await world.teacher.post(`/enrollments/${id}/approve`);

        for (const person of [world.student, world.parent]) {
          const { enrollments } = (await person.get('/enrollments')).body;
          expect(enrollments).toHaveLength(1);
          expect(enrollments[0]).toMatchObject({ id, status: 'approved' });
        }
        const catalog = await world.student.get('/catalog/subjects');
        expect(catalog.body.subjects[0].request).toEqual({ id, status: 'approved' });
      });
    });

    it('rejects a request, and the student may ask again', async () => {
      await inApi(async (api) => {
        const world = await setup(api);
        const id = await waitingForTeacher(world);

        const response = await world.teacher.post(`/enrollments/${id}/reject`);
        const again = await world.student.post('/enrollments', { subjectId: world.mathId });

        expect(response.body.enrollment).toMatchObject({
          status: 'rejected',
          teacherDecidedAt: expect.any(String),
        });
        expect(again.status).toBe(201);
      });
    });

    it('cannot answer a request that still waits for the parent, and cannot even tell it exists', async () => {
      await inApi(async (api) => {
        const world = await setup(api);
        const id = await studentAsks(world);

        for (const action of ['approve', 'reject']) {
          const response = await world.teacher.post(`/enrollments/${id}/${action}`);

          expect(response.status).toBe(404);
        }
        expect(await statusOf(api, id)).toBe('awaiting_parent');
      });
    });

    it('cannot see a request that the parent rejected', async () => {
      await inApi(async (api) => {
        const world = await setup(api);
        const id = await studentAsks(world);
        await world.parent.post(`/enrollments/${id}/reject`);

        expect((await world.teacher.post(`/enrollments/${id}/approve`)).status).toBe(404);
        expect(await statusOf(api, id)).toBe('rejected');
      });
    });

    it('cannot answer a request for a subject taught by somebody else', async () => {
      await inApi(async (api) => {
        const world = await setup(api);
        const { client, f } = api;
        await insertActivatedUser(client, f.schoolId, 'teacher', {
          username: 'mira_miric',
          email: 'mira@example.com',
          password: PASSWORD,
        });
        const other = await api.as('mira_miric');
        const id = await waitingForTeacher(world);

        for (const action of ['approve', 'reject']) {
          expect((await other.post(`/enrollments/${id}/${action}`)).status).toBe(404);
        }
        expect(await statusOf(api, id)).toBe('awaiting_teacher');
      });
    });

    it('cannot answer twice', async () => {
      await inApi(async (api) => {
        const world = await setup(api);
        const id = await waitingForTeacher(world);
        await world.teacher.post(`/enrollments/${id}/approve`);

        for (const action of ['approve', 'reject']) {
          const response = await world.teacher.post(`/enrollments/${id}/${action}`);

          expect(response.status).toBe(409);
          expect(response.body.error.code).toBe('wrong_state');
        }
        expect(await statusOf(api, id)).toBe('approved');
      });
    });

    it('is replaced for pending requests when the admin gives the subject a new teacher', async () => {
      await inApi(async (api) => {
        const world = await setup(api);
        const { client, f } = api;
        const newTeacherId = await insertActivatedUser(client, f.schoolId, 'teacher', {
          username: 'mira_miric',
          email: 'mira@example.com',
          password: PASSWORD,
        });
        const newTeacher = await api.as('mira_miric');
        const id = await waitingForTeacher(world);

        const changed = await api.patch(`/subjects/${world.mathId}`, { teacherId: newTeacherId });

        expect(changed.status).toBe(200);
        expect((await world.teacher.post(`/enrollments/${id}/approve`)).status).toBe(404);
        expect((await newTeacher.get('/enrollments')).body.total).toBe(1);
        expect((await newTeacher.post(`/enrollments/${id}/approve`)).status).toBe(200);
      });
    });

    it('answers 404 for an unknown request and a bad id', async () => {
      await inApi(async (api) => {
        const world = await setup(api);

        for (const id of [UNKNOWN, 'nope']) {
          expect((await world.teacher.post(`/enrollments/${id}/approve`)).status).toBe(404);
        }
      });
    });
  });

  describe('everybody else', () => {
    it('cannot answer: a student gets 403, an admin 403, nobody signed in 401', async () => {
      await inApi(async (api) => {
        const world = await setup(api);
        const id = await studentAsks(world);

        for (const action of ['approve', 'reject']) {
          expect((await world.student.post(`/enrollments/${id}/${action}`)).status).toBe(403);
          expect((await api.post(`/enrollments/${id}/${action}`)).status).toBe(403);
          expect((await request(api.app).post(`/enrollments/${id}/${action}`)).status).toBe(401);
        }
        expect(await statusOf(api, id)).toBe('awaiting_parent');
      });
    });
  });
});

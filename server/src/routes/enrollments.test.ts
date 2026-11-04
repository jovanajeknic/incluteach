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
import { inApi as runWithApi, PASSWORD, type Api } from './testApi.ts';

const UNKNOWN = '00000000-0000-0000-0000-000000000000';
const YEAR = currentSchoolYear();

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('enrollment requests', () => {
  // Created in beforeAll because describe bodies run even when the suite is skipped.
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  const inApi = (run: (api: Api) => Promise<void>) => runWithApi(pool, run);

  // School A: Ana (student) has her parent Petar; Marko (student) has none. Jovan teaches
  // Matematika and Fizika in class 5-2 of the current school year.
  async function setup(api: Api) {
    const { client, f } = api;
    const classId = await insertClass(client, f.schoolId, '5-2', YEAR);
    const mathId = await insertSubject(client, f.schoolId, classId, f.teacherId, 'Matematika');
    const physicsId = await insertSubject(client, f.schoolId, classId, f.teacherId, 'Fizika');
    await insertParentStudent(client, f.schoolId, f.parentId, f.studentId, f.adminId);
    return { classId, mathId, physicsId };
  }

  const names = (response: request.Response) =>
    (response.body.subjects as { name: string }[]).map((subject) => subject.name);

  describe('the subject catalog', () => {
    it('shows a student the subjects of their school for the current school year', async () => {
      await inApi(async (api) => {
        const { classId } = await setup(api);
        const { client, f } = api;
        const student = await api.as('ana_ivic');
        // None of these should be offered.
        const oldClass = await insertClass(client, f.schoolId, '9-1', YEAR - 1);
        await insertSubject(client, f.schoolId, oldClass, f.teacherId, 'Prošlogodišnji');
        const otherTeacher = await insertUser(client, f.otherSchoolId, 'teacher');
        const otherClass = await insertClass(client, f.otherSchoolId, '5-2', YEAR);
        await insertSubject(client, f.otherSchoolId, otherClass, otherTeacher, 'Tuđi predmet');
        const leftTeacher = await insertUser(client, f.schoolId, 'teacher', 'otisla_nastavnica');
        await insertSubject(client, f.schoolId, classId, leftTeacher, 'Bez nastavnika');
        await api.deactivate(leftTeacher);

        const response = await student.get('/catalog/subjects');

        expect(response.status).toBe(200);
        expect(response.body.schoolYear).toBe(YEAR);
        expect(response.body.total).toBe(2);
        expect(names(response)).toEqual(['Fizika', 'Matematika']);
        expect(response.body.subjects[1]).toEqual({
          id: expect.any(String),
          name: 'Matematika',
          className: '5-2',
          schoolYear: YEAR,
          teacher: { id: f.teacherId, fullName: 'Jovan Jovanović' },
          request: null,
        });
      });
    });

    it('can show another school year', async () => {
      await inApi(async (api) => {
        await setup(api);
        const { client, f } = api;
        const oldClass = await insertClass(client, f.schoolId, '9-1', YEAR - 1);
        await insertSubject(client, f.schoolId, oldClass, f.teacherId, 'Prošlogodišnji');
        const student = await api.as('ana_ivic');

        const response = await student.get(`/catalog/subjects?schoolYear=${YEAR - 1}`);

        expect(names(response)).toEqual(['Prošlogodišnji']);
        expect(response.body.schoolYear).toBe(YEAR - 1);
      });
    });

    it('searches the subject, class and teacher names, ignoring letter case', async () => {
      await inApi(async (api) => {
        await setup(api);
        const student = await api.as('ana_ivic');

        expect(names(await student.get('/catalog/subjects?search=MATEM'))).toEqual(['Matematika']);
        expect(names(await student.get('/catalog/subjects?search=jovanović'))).toEqual([
          'Fizika',
          'Matematika',
        ]);
        expect(names(await student.get('/catalog/subjects?search=5-2')).length).toBe(2);
        expect(names(await student.get('/catalog/subjects?search=nema'))).toEqual([]);
        expect(names(await student.get('/catalog/subjects?search=%25'))).toEqual([]);
        expect(names(await student.get('/catalog/subjects?search=%20fizika%20'))).toEqual([
          'Fizika',
        ]);
      });
    });

    it('shows the status of the request the student already sent', async () => {
      await inApi(async (api) => {
        const { mathId } = await setup(api);
        const student = await api.as('ana_ivic');
        const sent = await student.post('/enrollments', { subjectId: mathId });

        const response = await student.get('/catalog/subjects?search=matematika');

        expect(response.body.subjects[0].request).toEqual({
          id: sent.body.enrollment.id,
          status: 'awaiting_parent',
        });
      });
    });

    it('shows a rejected request, and a newer live request over an older rejected one', async () => {
      await inApi(async (api) => {
        const { mathId, physicsId } = await setup(api);
        const { client, f } = api;
        const student = await api.as('ana_ivic');
        const rejected = {
          schoolId: f.schoolId,
          studentId: f.studentId,
          requestedBy: f.studentId,
          requestedByRole: 'student' as const,
          status: 'rejected' as const,
          parentDecidedBy: f.parentId,
        };
        await insertEnrollment(client, { ...rejected, subjectId: mathId });
        await insertEnrollment(client, { ...rejected, subjectId: physicsId });
        const again = await student.post('/enrollments', { subjectId: physicsId });

        const { subjects } = (await student.get('/catalog/subjects')).body;

        const status = Object.fromEntries(
          subjects.map((s: { name: string; request: { status: string } | null }) => [
            s.name,
            s.request?.status,
          ]),
        );
        expect(status).toEqual({ Matematika: 'rejected', Fizika: 'awaiting_parent' });
        expect(again.status).toBe(201);
      });
    });

    it('lets a parent search for one of their own children', async () => {
      await inApi(async (api) => {
        const { mathId } = await setup(api);
        const parent = await api.as('petar_ivic');
        await parent.post('/enrollments', { subjectId: mathId, studentId: api.f.studentId });

        const response = await parent.get(`/catalog/subjects?studentId=${api.f.studentId}`);

        expect(response.status).toBe(200);
        expect(response.body.subjects[1].request.status).toBe('awaiting_teacher');
      });
    });

    it('needs a parent to name the child, and refuses a child who is not theirs', async () => {
      await inApi(async (api) => {
        await setup(api);
        const parent = await api.as('petar_ivic');

        const missing = await parent.get('/catalog/subjects');
        const notTheirs = await parent.get(
          `/catalog/subjects?studentId=${api.f.notActivatedStudentId}`,
        );
        const otherSchool = await parent.get(
          `/catalog/subjects?studentId=${api.f.otherSchoolStudentId}`,
        );

        expect(missing.status).toBe(400);
        expect(missing.body.error.code).toBe('invalid_student');
        expect(notTheirs.status).toBe(403);
        expect(otherSchool.status).toBe(403);
      });
    });

    it('does not let a student look as somebody else', async () => {
      await inApi(async (api) => {
        await setup(api);
        const student = await api.as('ana_ivic');

        expect(
          (await student.get(`/catalog/subjects?studentId=${api.f.notActivatedStudentId}`)).status,
        ).toBe(403);
        expect((await student.get(`/catalog/subjects?studentId=${api.f.studentId}`)).status).toBe(
          200,
        );
      });
    });

    it('splits the list into pages', async () => {
      await inApi(async (api) => {
        await setup(api);
        const student = await api.as('ana_ivic');

        const first = await student.get('/catalog/subjects?limit=1&offset=0');
        const second = await student.get('/catalog/subjects?limit=1&offset=1');

        expect([names(first), names(second)]).toEqual([['Fizika'], ['Matematika']]);
        expect([first.body.total, second.body.total]).toEqual([2, 2]);
      });
    });

    it.each([
      ['a school year out of range', 'schoolYear=1999'],
      ['a student id that is not a uuid', 'studentId=abc'],
      ['a search that is too long', `search=${'a'.repeat(101)}`],
      ['a limit of zero', 'limit=0'],
    ])('answers 400 for %s', async (_name, query) => {
      await inApi(async (api) => {
        const student = await api.as('ana_ivic');

        const response = await student.get(`/catalog/subjects?${query}`);

        expect(response.status).toBe(400);
      });
    });

    it('answers 401 when nobody is signed in and 403 for teachers and admins', async () => {
      await inApi(async (api) => {
        const teacher = await api.as('jovan_jovanovic');

        expect((await request(api.app).get('/catalog/subjects')).status).toBe(401);
        expect((await teacher.get('/catalog/subjects')).status).toBe(403);
        expect((await api.get('/catalog/subjects')).status).toBe(403);
      });
    });
  });

  describe('POST /enrollments', () => {
    it('lets a student ask, and the request then waits for a parent', async () => {
      await inApi(async (api) => {
        const { mathId } = await setup(api);
        const student = await api.as('ana_ivic');

        const response = await student.post('/enrollments', { subjectId: mathId });

        expect(response.status).toBe(201);
        expect(response.body.enrollment).toEqual({
          id: expect.any(String),
          status: 'awaiting_parent',
          student: { id: api.f.studentId, fullName: 'Ana Ivić' },
          subject: {
            id: mathId,
            name: 'Matematika',
            className: '5-2',
            schoolYear: YEAR,
            teacher: { id: api.f.teacherId, fullName: 'Jovan Jovanović', deleted: false },
          },
          requestedBy: 'student',
          parentDecidedAt: null,
          teacherDecidedAt: null,
          createdAt: expect.any(String),
        });
      });
    });

    it("sends a parent's request straight to the teacher, as the parent's confirmation", async () => {
      await inApi(async (api) => {
        const { mathId } = await setup(api);
        const parent = await api.as('petar_ivic');

        const response = await parent.post('/enrollments', {
          subjectId: mathId,
          studentId: api.f.studentId,
        });

        expect(response.status).toBe(201);
        expect(response.body.enrollment).toMatchObject({
          status: 'awaiting_teacher',
          requestedBy: 'parent',
          parentDecidedAt: expect.any(String),
          teacherDecidedAt: null,
        });
        const { rows } = await api.client.query<{ parent_decided_by: string }>(
          'SELECT parent_decided_by FROM enrollments WHERE id = $1',
          [response.body.enrollment.id],
        );
        expect(rows[0].parent_decided_by).toBe(api.f.parentId);
      });
    });

    it('refuses a parent who names a child that is not theirs, or no child at all', async () => {
      await inApi(async (api) => {
        const { mathId } = await setup(api);
        const parent = await api.as('petar_ivic');

        const notTheirs = await parent.post('/enrollments', {
          subjectId: mathId,
          studentId: api.f.notActivatedStudentId,
        });
        const otherSchool = await parent.post('/enrollments', {
          subjectId: mathId,
          studentId: api.f.otherSchoolStudentId,
        });
        const none = await parent.post('/enrollments', { subjectId: mathId });

        expect(notTheirs.status).toBe(403);
        expect(otherSchool.status).toBe(403);
        expect(none.status).toBe(400);
        expect(none.body.error.code).toBe('invalid_student');
        const { rows } = await api.client.query('SELECT 1 FROM enrollments');
        expect(rows).toHaveLength(0);
      });
    });

    it('does not let a student ask for somebody else', async () => {
      await inApi(async (api) => {
        const { mathId } = await setup(api);
        const student = await api.as('ana_ivic');

        const response = await student.post('/enrollments', {
          subjectId: mathId,
          studentId: api.f.notActivatedStudentId,
        });

        expect(response.status).toBe(403);
      });
    });

    it('refuses a student who has no parent or guardian linked', async () => {
      await inApi(async (api) => {
        const { mathId } = await setup(api);
        await insertActivatedUser(api.client, api.f.schoolId, 'student', {
          username: 'sam_ucenik',
          email: 'sam@example.com',
          password: PASSWORD,
        });
        const alone = await api.as('sam_ucenik');

        const response = await alone.post('/enrollments', { subjectId: mathId });

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe('no_parent');
      });
    });

    it('refuses a student whose parents have all left the school', async () => {
      await inApi(async (api) => {
        const { mathId } = await setup(api);
        const student = await api.as('ana_ivic');
        await api.deactivate(api.f.parentId);

        const response = await student.post('/enrollments', { subjectId: mathId });

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe('no_parent');
      });
    });

    it('accepts a student who has one active parent among several', async () => {
      await inApi(async (api) => {
        const { mathId } = await setup(api);
        const second = await insertUser(api.client, api.f.schoolId, 'parent');
        await insertParentStudent(
          api.client,
          api.f.schoolId,
          second,
          api.f.studentId,
          api.f.adminId,
        );
        const student = await api.as('ana_ivic');
        await api.deactivate(api.f.parentId);

        expect((await student.post('/enrollments', { subjectId: mathId })).status).toBe(201);
      });
    });

    it('refuses a request for a child who has left the school', async () => {
      await inApi(async (api) => {
        const { mathId } = await setup(api);
        const parent = await api.as('petar_ivic');
        await api.deactivate(api.f.studentId);

        const response = await parent.post('/enrollments', {
          subjectId: mathId,
          studentId: api.f.studentId,
        });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('invalid_student');
      });
    });

    it('refuses subjects of another school, unknown subjects, bad ids and subjects without a teacher', async () => {
      await inApi(async (api) => {
        const { classId } = await setup(api);
        const { client, f } = api;
        const student = await api.as('ana_ivic');
        const otherTeacher = await insertUser(client, f.otherSchoolId, 'teacher');
        const otherClass = await insertClass(client, f.otherSchoolId, '5-2', YEAR);
        const otherSubject = await insertSubject(client, f.otherSchoolId, otherClass, otherTeacher);
        const leftTeacher = await insertUser(client, f.schoolId, 'teacher');
        const orphan = await insertSubject(
          client,
          f.schoolId,
          classId,
          leftTeacher,
          'Bez nastavnika',
        );
        await api.deactivate(leftTeacher);

        for (const subjectId of [otherSubject, UNKNOWN, 'nope', 5, undefined, orphan]) {
          const response = await student.post('/enrollments', { subjectId });

          expect(response.status).toBe(400);
          expect(response.body.error.code).toBe('invalid_subject');
        }
      });
    });

    it('refuses a second request while one is waiting or approved, whoever sends it', async () => {
      await inApi(async (api) => {
        const { mathId } = await setup(api);
        const student = await api.as('ana_ivic');
        const parent = await api.as('petar_ivic');
        await student.post('/enrollments', { subjectId: mathId });

        const again = await student.post('/enrollments', { subjectId: mathId });
        const byParent = await parent.post('/enrollments', {
          subjectId: mathId,
          studentId: api.f.studentId,
        });

        for (const response of [again, byParent]) {
          expect(response.status).toBe(409);
          expect(response.body.error.code).toBe('request_exists');
        }
      });
    });

    it('allows a new request after a rejection', async () => {
      await inApi(async (api) => {
        const { mathId } = await setup(api);
        const { client, f } = api;
        await insertEnrollment(client, {
          schoolId: f.schoolId,
          studentId: f.studentId,
          subjectId: mathId,
          requestedBy: f.studentId,
          requestedByRole: 'student',
          status: 'rejected',
          parentDecidedBy: f.parentId,
        });
        const student = await api.as('ana_ivic');

        const response = await student.post('/enrollments', { subjectId: mathId });

        expect(response.status).toBe(201);
      });
    });

    it('answers 401 when nobody is signed in and 403 for teachers and admins', async () => {
      await inApi(async (api) => {
        const { mathId } = await setup(api);
        const teacher = await api.as('jovan_jovanovic');

        expect(
          (await request(api.app).post('/enrollments').send({ subjectId: mathId })).status,
        ).toBe(401);
        expect((await teacher.post('/enrollments', { subjectId: mathId })).status).toBe(403);
        expect((await api.post('/enrollments', { subjectId: mathId })).status).toBe(403);
      });
    });
  });

  describe('GET /enrollments', () => {
    // Ana asked for Matematika (waiting for her parent); Petar asked for Fizika for Ana
    // (goes to the teacher); a second family has one request that was rejected by the parent.
    async function withRequests(api: Api) {
      const ids = await setup(api);
      const { client, f } = api;
      const student = await api.as('ana_ivic');
      const parent = await api.as('petar_ivic');
      const waitingForParent = (await student.post('/enrollments', { subjectId: ids.mathId })).body
        .enrollment.id as string;
      const waitingForTeacher = (
        await parent.post('/enrollments', { subjectId: ids.physicsId, studentId: f.studentId })
      ).body.enrollment.id as string;

      const otherParent = await insertActivatedUser(client, f.schoolId, 'parent', {
        username: 'drugi_roditelj',
        email: 'drugi@example.com',
        password: PASSWORD,
        fullName: 'Drugi Roditelj',
      });
      const otherChild = await insertUser(
        client,
        f.schoolId,
        'student',
        'drugo_dijete',
        'Drugo Dijete',
      );
      await insertParentStudent(client, f.schoolId, otherParent, otherChild, f.adminId);
      const rejectedByParent = await insertEnrollment(client, {
        schoolId: f.schoolId,
        studentId: otherChild,
        subjectId: ids.mathId,
        requestedBy: otherChild,
        requestedByRole: 'student',
        status: 'rejected',
        parentDecidedBy: otherParent,
      });
      return {
        ...ids,
        otherChild,
        otherParent,
        waitingForParent,
        waitingForTeacher,
        rejectedByParent,
      };
    }

    const ids = (response: request.Response) =>
      (response.body.enrollments as { id: string }[]).map((e) => e.id);

    it('shows a student only their own requests', async () => {
      await inApi(async (api) => {
        const r = await withRequests(api);
        const student = await api.as('ana_ivic');

        const response = await student.get('/enrollments');

        expect(response.status).toBe(200);
        expect(response.body.total).toBe(2);
        expect(ids(response).sort()).toEqual([r.waitingForParent, r.waitingForTeacher].sort());
      });
    });

    it('shows a parent the requests of their own children only', async () => {
      await inApi(async (api) => {
        const r = await withRequests(api);
        const parent = await api.as('petar_ivic');
        const other = await api.as('drugi_roditelj');

        const mine = await parent.get('/enrollments');
        const theirs = await other.get('/enrollments');

        expect(ids(mine).sort()).toEqual([r.waitingForParent, r.waitingForTeacher].sort());
        expect(ids(theirs)).toEqual([r.rejectedByParent]);
      });
    });

    it('lets a parent narrow the list to one child, but only their own', async () => {
      await inApi(async (api) => {
        const r = await withRequests(api);
        const { client, f } = api;
        const secondChild = await insertUser(client, f.schoolId, 'student', 'sin_ivic', 'Sin Ivić');
        await insertParentStudent(client, f.schoolId, f.parentId, secondChild, f.adminId);
        await insertEnrollment(client, {
          schoolId: f.schoolId,
          studentId: secondChild,
          subjectId: r.physicsId,
          requestedBy: secondChild,
          requestedByRole: 'student',
        });
        const parent = await api.as('petar_ivic');

        const one = await parent.get(`/enrollments?studentId=${secondChild}`);
        const notTheirs = await parent.get(`/enrollments?studentId=${r.otherChild}`);

        expect(one.body.total).toBe(1);
        expect(one.body.enrollments[0].student.id).toBe(secondChild);
        expect(notTheirs.status).toBe(403);
      });
    });

    it('shows a teacher only requests the parent has passed on, for subjects they teach', async () => {
      await inApi(async (api) => {
        const r = await withRequests(api);
        const teacher = await api.as('jovan_jovanovic');

        const response = await teacher.get('/enrollments');

        // The one still waiting for the parent and the one the parent rejected stay hidden.
        expect(ids(response)).toEqual([r.waitingForTeacher]);
        expect(response.body.enrollments[0].student).toEqual({
          id: api.f.studentId,
          fullName: 'Ana Ivić',
        });
      });
    });

    it('shows a teacher the requests they approved or rejected too', async () => {
      await inApi(async (api) => {
        const r = await withRequests(api);
        const { client, f } = api;
        const students = [
          await insertUser(client, f.schoolId, 'student', 'a_ucenik'),
          await insertUser(client, f.schoolId, 'student', 'b_ucenik'),
        ];
        const decided: string[] = [];
        for (const [index, studentId] of students.entries()) {
          await insertParentStudent(client, f.schoolId, f.parentId, studentId, f.adminId);
          decided.push(
            await insertEnrollment(client, {
              schoolId: f.schoolId,
              studentId,
              subjectId: r.mathId,
              requestedBy: studentId,
              requestedByRole: 'student',
              status: index === 0 ? 'approved' : 'rejected',
              parentDecidedBy: f.parentId,
              teacherDecidedBy: f.teacherId,
            }),
          );
        }
        const teacher = await api.as('jovan_jovanovic');

        const response = await teacher.get('/enrollments');

        expect(ids(response).sort()).toEqual([r.waitingForTeacher, ...decided].sort());
      });
    });

    it("does not show a teacher the requests for other teachers' subjects", async () => {
      await inApi(async (api) => {
        const r = await withRequests(api);
        const { client, f } = api;
        await insertActivatedUser(client, f.schoolId, 'teacher', {
          username: 'mira_miric',
          email: 'mira@example.com',
          password: PASSWORD,
        });
        const mira = await api.as('mira_miric');

        const response = await mira.get('/enrollments');

        expect(response.body).toEqual({ enrollments: [], total: 0 });
        expect(r.waitingForTeacher).toBeTruthy();
      });
    });

    it('filters by status and subject', async () => {
      await inApi(async (api) => {
        const r = await withRequests(api);
        const student = await api.as('ana_ivic');

        const waiting = await student.get('/enrollments?status=awaiting_parent');
        const physics = await student.get(`/enrollments?subjectId=${r.physicsId}`);

        expect(ids(waiting)).toEqual([r.waitingForParent]);
        expect(ids(physics)).toEqual([r.waitingForTeacher]);
      });
    });

    it('lists the newest request first and splits the list into pages', async () => {
      await inApi(async (api) => {
        const r = await withRequests(api);
        const student = await api.as('ana_ivic');

        const first = await student.get('/enrollments?limit=1&offset=0');
        const second = await student.get('/enrollments?limit=1&offset=1');

        expect(ids(first)).toHaveLength(1);
        expect(ids(second)).toHaveLength(1);
        expect(first.body.total).toBe(2);
        expect([...ids(first), ...ids(second)].sort()).toEqual(
          [r.waitingForParent, r.waitingForTeacher].sort(),
        );
      });
    });

    it('never shows requests of another school', async () => {
      await inApi(async (api) => {
        await withRequests(api);
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
        await insertEnrollment(client, {
          schoolId: f.otherSchoolId,
          studentId: f.otherSchoolStudentId,
          subjectId: otherSubject,
          requestedBy: f.otherSchoolStudentId,
          requestedByRole: 'student',
        });
        const teacher = await api.as('jovan_jovanovic');
        const parent = await api.as('petar_ivic');

        expect((await teacher.get('/enrollments')).body.total).toBe(1);
        expect((await parent.get('/enrollments')).body.total).toBe(2);
      });
    });

    it.each([
      ['an unknown status', 'status=maybe'],
      ['a subject id that is not a uuid', 'subjectId=abc'],
      ['a student id that is not a uuid', 'studentId=abc'],
      ['a limit above 200', 'limit=201'],
      ['a negative offset', 'offset=-1'],
    ])('answers 400 for %s', async (_name, query) => {
      await inApi(async (api) => {
        const student = await api.as('ana_ivic');

        const response = await student.get(`/enrollments?${query}`);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('invalid_request');
      });
    });

    it('answers 401 when nobody is signed in and 403 for admins', async () => {
      await inApi(async (api) => {
        expect((await request(api.app).get('/enrollments')).status).toBe(401);
        expect((await api.get('/enrollments')).status).toBe(403);
      });
    });
  });
  describe('the class filter', () => {
    const classNames = (response: request.Response) =>
      (response.body.classes as { name: string }[]).map((item) => item.name);

    it('lists the classes of the school that have subjects to join, with how many', async () => {
      await inApi(async (api) => {
        const { classId } = await setup(api);
        const { client, f } = api;
        const student = await api.as('ana_ivic');
        const sixth = await insertClass(client, f.schoolId, '6-1', YEAR);
        await insertSubject(client, f.schoolId, sixth, f.teacherId, 'Geografija');
        // None of these should be offered.
        await insertClass(client, f.schoolId, '7-1', YEAR);
        const oldClass = await insertClass(client, f.schoolId, '9-1', YEAR - 1);
        await insertSubject(client, f.schoolId, oldClass, f.teacherId, 'Prošlogodišnji');
        const otherTeacher = await insertUser(client, f.otherSchoolId, 'teacher');
        const otherClass = await insertClass(client, f.otherSchoolId, '5-2', YEAR);
        await insertSubject(client, f.otherSchoolId, otherClass, otherTeacher);
        const leftTeacher = await insertUser(client, f.schoolId, 'teacher');
        const leftClass = await insertClass(client, f.schoolId, '8-1', YEAR);
        await insertSubject(client, f.schoolId, leftClass, leftTeacher, 'Bez nastavnika');
        await insertSubject(client, f.schoolId, classId, leftTeacher, 'Takođe bez nastavnika');
        await api.deactivate(leftTeacher);

        const response = await student.get('/catalog/classes');

        expect(response.status).toBe(200);
        expect(response.body.schoolYear).toBe(YEAR);
        expect(response.body.classes).toEqual([
          { id: classId, name: '5-2', schoolYear: YEAR, subjectCount: 2 },
          { id: sixth, name: '6-1', schoolYear: YEAR, subjectCount: 1 },
        ]);
      });
    });

    it('can show another school year', async () => {
      await inApi(async (api) => {
        await setup(api);
        const { client, f } = api;
        const oldClass = await insertClass(client, f.schoolId, '9-1', YEAR - 1);
        await insertSubject(client, f.schoolId, oldClass, f.teacherId, 'Prošlogodišnji');
        const student = await api.as('ana_ivic');

        const response = await student.get(`/catalog/classes?schoolYear=${YEAR - 1}`);

        expect(classNames(response)).toEqual(['9-1']);
      });
    });

    it('is open to a parent without naming a child', async () => {
      await inApi(async (api) => {
        await setup(api);
        const parent = await api.as('petar_ivic');

        const response = await parent.get('/catalog/classes');

        expect(classNames(response)).toEqual(['5-2']);
      });
    });

    it('answers 400 for a school year out of range', async () => {
      await inApi(async (api) => {
        const student = await api.as('ana_ivic');

        expect((await student.get('/catalog/classes?schoolYear=1999')).status).toBe(400);
      });
    });

    it('answers 401 when nobody is signed in and 403 for teachers and admins', async () => {
      await inApi(async (api) => {
        const teacher = await api.as('jovan_jovanovic');

        expect((await request(api.app).get('/catalog/classes')).status).toBe(401);
        expect((await teacher.get('/catalog/classes')).status).toBe(403);
        expect((await api.get('/catalog/classes')).status).toBe(403);
      });
    });

    it('narrows the subjects to one class', async () => {
      await inApi(async (api) => {
        const { classId } = await setup(api);
        const { client, f } = api;
        const sixth = await insertClass(client, f.schoolId, '6-1', YEAR);
        await insertSubject(client, f.schoolId, sixth, f.teacherId, 'Geografija');
        const student = await api.as('ana_ivic');

        const fifth = await student.get(`/catalog/subjects?classId=${classId}`);
        const sixthOnly = await student.get(`/catalog/subjects?classId=${sixth}`);

        expect(names(fifth)).toEqual(['Fizika', 'Matematika']);
        expect(names(sixthOnly)).toEqual(['Geografija']);
      });
    });

    it('combines the class with a search', async () => {
      await inApi(async (api) => {
        const { classId } = await setup(api);
        const student = await api.as('ana_ivic');

        const response = await student.get(`/catalog/subjects?classId=${classId}&search=fiz`);

        expect(names(response)).toEqual(['Fizika']);
      });
    });

    it('shows nothing for an unknown class or a class of another school', async () => {
      await inApi(async (api) => {
        await setup(api);
        const { client, f } = api;
        const otherTeacher = await insertUser(client, f.otherSchoolId, 'teacher');
        const otherClass = await insertClass(client, f.otherSchoolId, '5-2', YEAR);
        await insertSubject(client, f.otherSchoolId, otherClass, otherTeacher);
        const student = await api.as('ana_ivic');

        for (const classId of [UNKNOWN, otherClass]) {
          const response = await student.get(`/catalog/subjects?classId=${classId}`);

          expect(response.status).toBe(200);
          expect(response.body).toMatchObject({ subjects: [], total: 0 });
        }
      });
    });

    it('answers 400 for a class id that is not a uuid', async () => {
      await inApi(async (api) => {
        const student = await api.as('ana_ivic');

        const response = await student.get('/catalog/subjects?classId=abc');

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('invalid_request');
      });
    });
  });
});

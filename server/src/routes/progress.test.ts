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
describe.skipIf(!process.env.DATABASE_URL)('progress in a subject', () => {
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
    strangerParent: Requests;
    lessons: string[];
  }

  // Ana joined Biologija, which has three published lessons and one draft. A second teacher
  // teaches Fizika, which has nobody in it.
  async function setup(api: Api): Promise<World> {
    const { client, f } = api;
    const otherTeacherId = await insertActivatedUser(client, f.schoolId, 'teacher', {
      username: 'mira_miric',
      email: 'mira@example.com',
      password: PASSWORD,
    });
    await insertActivatedUser(client, f.schoolId, 'parent', {
      username: 'tudji_roditelj',
      email: 'tudji@example.com',
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
    await join(api, f.studentId, subjectId);

    const lessons: string[] = [];
    for (const title of ['Prva', 'Druga', 'Treća']) {
      lessons.push(
        await insertLesson(client, {
          schoolId: f.schoolId,
          subjectId,
          createdBy: f.teacherId,
          title,
          status: 'published',
          publishedAt: new Date().toISOString(),
        }),
      );
    }
    await insertLesson(client, {
      schoolId: f.schoolId,
      subjectId,
      createdBy: f.teacherId,
      title: 'Nacrt',
    });
    return {
      subjectId,
      otherSubjectId,
      lessons,
      teacher: await api.as('jovan_jovanovic'),
      otherTeacher: await api.as('mira_miric'),
      student: await api.as('ana_ivic'),
      parent: await api.as('petar_ivic'),
      strangerParent: await api.as('tudji_roditelj'),
    };
  }

  const join = (api: Api, studentId: string, subjectId: string) =>
    insertEnrollment(api.client, {
      schoolId: api.f.schoolId,
      studentId,
      subjectId,
      requestedBy: studentId,
      requestedByRole: 'student',
      status: 'approved',
      parentDecidedBy: api.f.parentId,
      teacherDecidedBy: api.f.teacherId,
    });

  // A new student of School A who joined the subject.
  async function newStudent(api: Api, w: World, username: string, fullName: string) {
    const id = await insertActivatedUser(api.client, api.f.schoolId, 'student', {
      username,
      email: `${username}@example.com`,
      password: PASSWORD,
      fullName,
    });
    // The parent who decides on the request must be a parent of the student.
    await insertParentStudent(api.client, api.f.schoolId, api.f.parentId, id, api.f.adminId);
    await join(api, id, w.subjectId);
    return { id, requests: await api.as(username) };
  }

  const finish = (who: Requests, lessonId: string) => who.post(`/lessons/${lessonId}/complete`);
  const progress = (who: Requests, w: World, query = '', subjectId = w.subjectId) =>
    who.get(`/subjects/${subjectId}/progress${query}`);
  const table = (who: Requests, w: World, subjectId = w.subjectId) =>
    who.get(`/subjects/${subjectId}/progress/students`);

  describe('of one student', () => {
    it('shows a student the finished and the published lessons, and the stars', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        await finish(w.student, w.lessons[0]);
        await finish(w.student, w.lessons[1]);
        await w.teacher.post('/stars', {
          studentId: api.f.studentId,
          subjectId: w.subjectId,
          message: 'Bravo',
        });

        const response = await progress(w.student, w);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          student: { id: api.f.studentId, fullName: 'Ana Ivić' },
          subject: { id: w.subjectId, name: 'Biologija' },
          lessons: { published: 3, completed: 2 },
          stars: { automatic: 2, teacher: 1 },
        });
        expect(response.body.items).toHaveLength(3);
        const done = response.body.items.filter((item: { completed: boolean }) => item.completed);
        expect(done.map((item: { id: string }) => item.id).sort()).toEqual(
          [w.lessons[0], w.lessons[1]].sort(),
        );
        expect(done[0].completedAt).toEqual(expect.any(String));
        const open = response.body.items.find((item: { id: string }) => item.id === w.lessons[2]);
        expect(open).toMatchObject({ title: 'Treća', completed: false, completedAt: null });
      });
    });

    it('does not count a lesson that is no longer published', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        await finish(w.student, w.lessons[0]);
        await w.teacher.post(`/lessons/${w.lessons[0]}/unpublish`);

        const response = await progress(w.student, w);

        expect(response.body.lessons).toEqual({ published: 2, completed: 0 });
      });
    });

    it('is zero for a subject without lessons', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        await api.client.query('DELETE FROM lessons');

        const response = await progress(w.student, w);

        expect(response.body.lessons).toEqual({ published: 0, completed: 0 });
        expect(response.body.items).toEqual([]);
        expect(response.body.stars).toEqual({ automatic: 0, teacher: 0 });
      });
    });

    it('shows a parent the progress of their own child', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        await finish(w.student, w.lessons[0]);
        const childQuery = `?studentId=${api.f.studentId}`;

        const ok = await progress(w.parent, w, childQuery);
        expect(ok.status).toBe(200);
        expect(ok.body.lessons).toEqual({ published: 3, completed: 1 });
        expect((await progress(w.parent, w)).body.error.code).toBe('invalid_student');
        expect((await progress(w.strangerParent, w, childQuery)).status).toBe(403);
        const stranger = `?studentId=${api.f.otherSchoolStudentId}`;
        expect((await progress(w.parent, w, stranger)).status).toBe(403);
      });
    });

    it('shows the teacher of the subject the progress of a student who joined it', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        await finish(w.student, w.lessons[0]);
        const studentQuery = `?studentId=${api.f.studentId}`;

        const ok = await progress(w.teacher, w, studentQuery);
        expect(ok.status).toBe(200);
        expect(ok.body.lessons.completed).toBe(1);
        expect((await progress(w.teacher, w)).body.error.code).toBe('invalid_student');
        expect((await progress(w.otherTeacher, w, studentQuery)).status).toBe(404);
        const notJoined = `?studentId=${api.f.notActivatedStudentId}`;
        expect((await progress(w.teacher, w, notJoined)).status).toBe(404);
        expect((await progress(w.teacher, w, studentQuery, w.otherSubjectId)).status).toBe(404);
      });
    });

    it('is refused for another student, for the admin, and for ids that are not valid', async () => {
      await inApi(async (api) => {
        const w = await setup(api);

        const other = `?studentId=${api.f.notActivatedStudentId}`;
        expect((await progress(w.student, w, other)).status).toBe(403);
        expect((await progress(api, w)).status).toBe(403);
        expect((await progress(w.student, w, '?studentId=x')).status).toBe(400);
        expect((await w.student.get('/subjects/nije-uuid/progress')).status).toBe(404);
        // A student who has not joined the subject sees nothing of it.
        expect((await progress(w.student, w, '', w.otherSubjectId)).status).toBe(404);
      });
    });
  });

  describe('the table of the teacher', () => {
    it('ranks the students by finished lessons, then by stars, and shares a rank when equal', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const luka = await newStudent(api, w, 'luka_lukic', 'Luka Lukić');
        const sara = await newStudent(api, w, 'sara_savic', 'Sara Savić');
        const tea = await newStudent(api, w, 'tea_tomic', 'Tea Tomić');
        await newStudent(api, w, 'zoran_zoric', 'Zoran Zorić');
        // Ana 2 lessons (2 stars), Luka 2 lessons and a star from the teacher (3 stars),
        // Sara and Tea 1 lesson each, Zoran nothing.
        await finish(w.student, w.lessons[0]);
        await finish(w.student, w.lessons[1]);
        await finish(luka.requests, w.lessons[0]);
        await finish(luka.requests, w.lessons[1]);
        await w.teacher.post('/stars', {
          studentId: luka.id,
          subjectId: w.subjectId,
          message: 'Bravo',
        });
        await finish(sara.requests, w.lessons[0]);
        await finish(tea.requests, w.lessons[2]);

        const response = await table(w.teacher, w);

        expect(response.status).toBe(200);
        expect(response.body.subject).toEqual({ id: w.subjectId, name: 'Biologija' });
        expect(response.body.publishedLessons).toBe(3);
        expect(
          response.body.students.map(
            (row: { rank: number; student: { fullName: string } }) =>
              `${row.rank} ${row.student.fullName}`,
          ),
        ).toEqual(['1 Luka Lukić', '2 Ana Ivić', '3 Sara Savić', '3 Tea Tomić', '5 Zoran Zorić']);
        expect(response.body.students[0]).toMatchObject({
          student: { id: luka.id, fullName: 'Luka Lukić' },
          completedLessons: 2,
          stars: { automatic: 2, teacher: 1 },
        });
        expect(response.body.students[4]).toMatchObject({
          completedLessons: 0,
          stars: { automatic: 0, teacher: 0 },
        });
      });
    });

    it('lists only students who joined, and not deactivated ones', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const luka = await newStudent(api, w, 'luka_lukic', 'Luka Lukić');
        // Marko asked to join, but nobody decided yet.
        await insertEnrollment(api.client, {
          schoolId: api.f.schoolId,
          studentId: api.f.notActivatedStudentId,
          subjectId: w.subjectId,
          requestedBy: api.f.notActivatedStudentId,
          requestedByRole: 'student',
          status: 'awaiting_parent',
        });
        await api.deactivate(luka.id);

        const response = await table(w.teacher, w);

        expect(
          response.body.students.map(
            (row: { student: { fullName: string } }) => row.student.fullName,
          ),
        ).toEqual(['Ana Ivić']);
      });
    });

    it('is empty for a subject nobody joined', async () => {
      await inApi(async (api) => {
        const w = await setup(api);

        const response = await table(w.otherTeacher, w, w.otherSubjectId);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          subject: { id: w.otherSubjectId, name: 'Fizika' },
          publishedLessons: 0,
          students: [],
        });
      });
    });

    it('is only for the teacher of the subject, so a student never sees a ranking', async () => {
      await inApi(async (api) => {
        const w = await setup(api);

        expect((await table(w.otherTeacher, w)).status).toBe(404);
        for (const person of [w.student, w.parent, api]) {
          expect((await table(person, w)).status).toBe(403);
        }
        expect((await w.teacher.get('/subjects/nije-uuid/progress/students')).status).toBe(404);
      });
    });
  });

  it('does not stop the admin from managing subjects', async () => {
    await inApi(async (api) => {
      const w = await setup(api);

      const response = await api.get('/subjects');

      expect(response.status).toBe(200);
      expect(response.body.subjects.map((s: { name: string }) => s.name).sort()).toEqual([
        'Biologija',
        'Fizika',
      ]);
      expect(w.subjectId).toBeDefined();
    });
  });
});

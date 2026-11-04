import type pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPool } from '../db/pool.ts';
import { insertParentStudent, insertUser } from '../db/testUtils.ts';
import { inApi as runWithApi, type Api } from './testApi.ts';

const NOT_ADMINS = ['ana_ivic', 'jovan_jovanovic', 'petar_ivic'];
const UNKNOWN = '00000000-0000-0000-0000-000000000000';

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('parent-student links', () => {
  // Created in beforeAll because describe bodies run even when the suite is skipped.
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  const inApi = (run: (api: Api) => Promise<void>) => runWithApi(pool, run);

  const pairs = (response: request.Response) =>
    (response.body.links as { parent: { username: string }; student: { username: string } }[]).map(
      (link) => `${link.parent.username}->${link.student.username}`,
    );

  describe('POST /parent-students', () => {
    it('links a parent to a child', async () => {
      await inApi(async ({ post, f }) => {
        const response = await post('/parent-students', {
          parentId: f.parentId,
          studentId: f.studentId,
        });

        expect(response.status).toBe(201);
        expect(response.body.link).toEqual({
          parent: {
            id: f.parentId,
            fullName: 'Petar Ivić',
            username: 'petar_ivic',
            deactivated: false,
            deleted: false,
          },
          student: {
            id: f.studentId,
            fullName: 'Ana Ivić',
            username: 'ana_ivic',
            deactivated: false,
            deleted: false,
          },
          createdAt: expect.any(String),
        });
      });
    });

    it('records which admin made the link', async () => {
      await inApi(async ({ post, client, f }) => {
        await post('/parent-students', { parentId: f.parentId, studentId: f.studentId });

        const { rows } = await client.query<{ created_by: string }>(
          'SELECT created_by FROM parent_students WHERE parent_id = $1 AND student_id = $2',
          [f.parentId, f.studentId],
        );
        expect(rows).toEqual([{ created_by: f.adminId }]);
      });
    });

    it('allows a parent with several children and a child with several parents', async () => {
      await inApi(async ({ post, client, f }) => {
        const secondParent = await insertUser(client, f.schoolId, 'parent');

        for (const [parentId, studentId] of [
          [f.parentId, f.studentId],
          [f.parentId, f.notActivatedStudentId],
          [secondParent, f.studentId],
        ]) {
          expect((await post('/parent-students', { parentId, studentId })).status).toBe(201);
        }
      });
    });

    it('refuses the same link twice', async () => {
      await inApi(async ({ post, f }) => {
        await post('/parent-students', { parentId: f.parentId, studentId: f.studentId });

        const response = await post('/parent-students', {
          parentId: f.parentId,
          studentId: f.studentId,
        });

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe('link_exists');
      });
    });

    it.each(['student', 'teacher', 'admin'] as const)(
      'refuses a user with the role "%s" as the parent',
      async (role) => {
        await inApi(async ({ post, client, f }) => {
          const notAParent = await insertUser(client, f.schoolId, role);

          const response = await post('/parent-students', {
            parentId: notAParent,
            studentId: f.studentId,
          });

          expect(response.status).toBe(400);
          expect(response.body.error.code).toBe('invalid_parent');
        });
      },
    );

    it.each(['parent', 'teacher', 'admin'] as const)(
      'refuses a user with the role "%s" as the child',
      async (role) => {
        await inApi(async ({ post, client, f }) => {
          const notAStudent = await insertUser(client, f.schoolId, role);

          const response = await post('/parent-students', {
            parentId: f.parentId,
            studentId: notAStudent,
          });

          expect(response.status).toBe(400);
          expect(response.body.error.code).toBe('invalid_student');
        });
      },
    );

    it('refuses people of another school, unknown people and bad ids', async () => {
      await inApi(async ({ post, client, f }) => {
        const otherParent = await insertUser(client, f.otherSchoolId, 'parent');

        for (const parentId of [otherParent, UNKNOWN, 'nope', 42, undefined]) {
          const response = await post('/parent-students', { parentId, studentId: f.studentId });

          expect(response.status).toBe(400);
          expect(response.body.error.code).toBe('invalid_parent');
        }
        for (const studentId of [f.otherSchoolStudentId, UNKNOWN, 'nope', 42, undefined]) {
          const response = await post('/parent-students', { parentId: f.parentId, studentId });

          expect(response.status).toBe(400);
          expect(response.body.error.code).toBe('invalid_student');
        }
      });
    });

    it('refuses a parent or a child who has left, or whose data was erased', async () => {
      await inApi(async (api) => {
        const { post, client, f } = api;
        const leftParent = await insertUser(client, f.schoolId, 'parent');
        const erasedStudent = await insertUser(client, f.schoolId, 'student');
        await api.deactivate(leftParent, f.studentId, erasedStudent);
        await api.post('/users/delete', { ids: [erasedStudent] });

        const parentResponse = await post('/parent-students', {
          parentId: leftParent,
          studentId: f.notActivatedStudentId,
        });
        const studentResponse = await post('/parent-students', {
          parentId: f.parentId,
          studentId: f.studentId,
        });
        const erasedResponse = await post('/parent-students', {
          parentId: f.parentId,
          studentId: erasedStudent,
        });

        expect(parentResponse.body.error.code).toBe('invalid_parent');
        expect(studentResponse.body.error.code).toBe('invalid_student');
        expect(erasedResponse.body.error.code).toBe('invalid_student');
      });
    });

    it('answers 401 when nobody is signed in', async () => {
      await inApi(async ({ app }) => {
        expect((await request(app).post('/parent-students').send({})).status).toBe(401);
      });
    });

    it.each(NOT_ADMINS)('answers 403 for %s, who is not an admin', async (username) => {
      await inApi(async ({ as, f }) => {
        const response = await (
          await as(username)
        ).post('/parent-students', { parentId: f.parentId, studentId: f.studentId });

        expect(response.status).toBe(403);
      });
    });
  });

  describe('GET /parent-students', () => {
    async function withLinks({ client, f }: Api) {
      const secondParent = await insertUser(client, f.schoolId, 'parent', 'ivan_ivic', 'Ivan Ivić');
      await insertParentStudent(client, f.schoolId, f.parentId, f.studentId, f.adminId);
      await insertParentStudent(client, f.schoolId, secondParent, f.studentId, f.adminId);
      await insertParentStudent(client, f.schoolId, f.parentId, f.notActivatedStudentId, f.adminId);
      return { secondParent };
    }

    it('lists the links of the school', async () => {
      await inApi(async (api) => {
        await withLinks(api);

        const response = await api.get('/parent-students');

        expect(response.status).toBe(200);
        expect(response.body.total).toBe(3);
        // Sorted by the child's name, then by the parent's name.
        expect(pairs(response)).toEqual([
          'ivan_ivic->ana_ivic',
          'petar_ivic->ana_ivic',
          'petar_ivic->marko_maric',
        ]);
      });
    });

    it('shows the parents of one child', async () => {
      await inApi(async (api) => {
        await withLinks(api);

        const response = await api.get(`/parent-students?studentId=${api.f.studentId}`);

        expect(response.body.total).toBe(2);
        expect(pairs(response)).toEqual(['ivan_ivic->ana_ivic', 'petar_ivic->ana_ivic']);
      });
    });

    it('shows the children of one parent', async () => {
      await inApi(async (api) => {
        await withLinks(api);

        const response = await api.get(`/parent-students?parentId=${api.f.parentId}`);

        expect(pairs(response)).toEqual(['petar_ivic->ana_ivic', 'petar_ivic->marko_maric']);
      });
    });

    it('shows nothing for a child without parents', async () => {
      await inApi(async (api) => {
        await withLinks(api);

        const response = await api.get(`/parent-students?studentId=${UNKNOWN}`);

        expect(response.body).toEqual({ links: [], total: 0 });
      });
    });

    it('does not show links of another school', async () => {
      await inApi(async (api) => {
        const { client, f } = api;
        const otherAdmin = await insertUser(client, f.otherSchoolId, 'admin');
        const otherParent = await insertUser(client, f.otherSchoolId, 'parent');
        await insertParentStudent(
          client,
          f.otherSchoolId,
          otherParent,
          f.otherSchoolStudentId,
          otherAdmin,
        );

        const all = await api.get('/parent-students');
        const byStudent = await api.get(`/parent-students?studentId=${f.otherSchoolStudentId}`);

        expect(all.body.total).toBe(0);
        expect(byStudent.body.total).toBe(0);
      });
    });

    it('splits the list into pages and reports the total', async () => {
      await inApi(async (api) => {
        await withLinks(api);

        const first = await api.get('/parent-students?limit=2&offset=0');
        const second = await api.get('/parent-students?limit=2&offset=2');

        expect(first.body.links).toHaveLength(2);
        expect(second.body.links).toHaveLength(1);
        expect([first.body.total, second.body.total]).toEqual([3, 3]);
      });
    });

    it('marks a parent or child who has left', async () => {
      await inApi(async (api) => {
        await withLinks(api);
        await api.deactivate(api.f.parentId);

        const { links } = (await api.get(`/parent-students?studentId=${api.f.studentId}`)).body;

        const byName = Object.fromEntries(
          links.map((link: { parent: { username: string; deactivated: boolean } }) => [
            link.parent.username,
            link.parent.deactivated,
          ]),
        );
        expect(byName).toEqual({ petar_ivic: true, ivan_ivic: false });
      });
    });

    it.each([
      ['a parent id that is not a uuid', 'parentId=abc'],
      ['a student id that is not a uuid', 'studentId=abc'],
      ['a limit of zero', 'limit=0'],
      ['a negative offset', 'offset=-1'],
    ])('answers 400 for %s', async (_name, query) => {
      await inApi(async ({ get }) => {
        const response = await get(`/parent-students?${query}`);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('invalid_request');
      });
    });

    it.each(NOT_ADMINS)('answers 403 for %s, who is not an admin', async (username) => {
      await inApi(async ({ as }) => {
        expect((await (await as(username)).get('/parent-students')).status).toBe(403);
      });
    });
  });
});

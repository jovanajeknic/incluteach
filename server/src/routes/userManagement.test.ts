import type pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPool } from '../db/pool.ts';
import {
  insertClass,
  insertEnrollment,
  insertParentStudent,
  insertSubject,
} from '../db/testUtils.ts';
import { inApi as runWithApi, type Api } from './testApi.ts';
import { sessionCookie } from './testHelpers.ts';

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('user management', () => {
  // Created in beforeAll because describe bodies run even when the suite is skipped.
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  const inApi = (run: (api: Api) => Promise<void>) => runWithApi(pool, run);

  const names = (response: request.Response) =>
    (response.body.users as { username: string }[]).map((user) => user.username);

  describe('GET /users', () => {
    it("lists the active users of the admin's school, sorted by name", async () => {
      await inApi(async ({ get }) => {
        const response = await get('/users');

        expect(response.status).toBe(200);
        expect(response.body.total).toBe(5);
        expect(names(response)).toEqual([
          'admin_a',
          'ana_ivic',
          'jovan_jovanovic',
          'marko_maric',
          'petar_ivic',
        ]);
      });
    });

    it('describes each user without any secret', async () => {
      await inApi(async ({ get, f }) => {
        const { body } = await get('/users?role=student');

        const ana = body.users.find((user: { id: string }) => user.id === f.studentId);
        expect(ana).toEqual({
          id: f.studentId,
          username: 'ana_ivic',
          fullName: 'Ana Ivić',
          email: 'ana_ivic@example.com',
          role: 'student',
          activated: true,
          deactivatedAt: null,
          createdAt: expect.any(String),
        });
        expect(JSON.stringify(body)).not.toMatch(/password|scrypt|school_?id/i);
      });
    });

    it('shows who has not activated the account yet', async () => {
      await inApi(async ({ get, f }) => {
        const { body } = await get('/users?role=student');

        const marko = body.users.find(
          (user: { id: string }) => user.id === f.notActivatedStudentId,
        );
        expect(marko).toMatchObject({ activated: false, email: null });
      });
    });

    it('filters by role', async () => {
      await inApi(async ({ get }) => {
        expect(names(await get('/users?role=student'))).toEqual(['ana_ivic', 'marko_maric']);
        expect(names(await get('/users?role=teacher'))).toEqual(['jovan_jovanovic']);
      });
    });

    it('searches the name and username, ignoring letter case', async () => {
      await inApi(async ({ get }) => {
        expect(names(await get('/users?search=IVIC'))).toEqual(['ana_ivic', 'petar_ivic']);
        expect(names(await get('/users?search=jovan'))).toEqual(['jovan_jovanovic']);
        expect(names(await get(`/users?search=${encodeURIComponent('JOVANOVIĆ')}`))).toEqual([
          'jovan_jovanovic',
        ]);
      });
    });

    it('treats % and _ in a search as plain characters', async () => {
      await inApi(async ({ get }) => {
        expect((await get('/users?search=%25')).body.total).toBe(0);
        // As a wildcard "a_i" would also match "ari" in "Marić"; as plain text only "ana_ivic".
        expect(names(await get('/users?search=a_i'))).toEqual(['ana_ivic']);
      });
    });

    it('splits the list into pages and reports the total', async () => {
      await inApi(async ({ get }) => {
        const first = await get('/users?limit=2&offset=0');
        const second = await get('/users?limit=2&offset=2');
        const last = await get('/users?limit=2&offset=4');

        expect(names(first)).toEqual(['admin_a', 'ana_ivic']);
        expect(names(second)).toEqual(['jovan_jovanovic', 'marko_maric']);
        expect(names(last)).toEqual(['petar_ivic']);
        expect([first, second, last].map((r) => r.body.total)).toEqual([5, 5, 5]);
      });
    });

    it('does not list users of another school', async () => {
      await inApi(async ({ get }) => {
        expect(names(await get('/users?status=all'))).not.toContain('tudji_ucenik');
      });
    });

    it.each([
      ['an unknown role', 'role=king'],
      ['an unknown status', 'status=gone'],
      ['a limit of zero', 'limit=0'],
      ['a limit above 200', 'limit=201'],
      ['a limit that is not a number', 'limit=abc'],
      ['a negative offset', 'offset=-1'],
      ['a search that is too long', `search=${'a'.repeat(101)}`],
    ])('answers 400 for %s', async (_name, query) => {
      await inApi(async ({ get }) => {
        const response = await get(`/users?${query}`);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('invalid_request');
      });
    });

    it('answers 401 when nobody is signed in', async () => {
      await inApi(async ({ app }) => {
        expect((await request(app).get('/users')).status).toBe(401);
      });
    });

    it.each(['ana_ivic', 'jovan_jovanovic', 'petar_ivic'])(
      'answers 403 for %s, who is not an admin',
      async (username) => {
        await inApi(async ({ app, signIn }) => {
          const cookie = sessionCookie(await signIn(username));

          const response = await request(app).get('/users').set('Cookie', cookie);

          expect(response.status).toBe(403);
        });
      },
    );
  });

  describe('GET /users/:id', () => {
    it('describes one user of the school, also one who left it', async () => {
      await inApi(async ({ get, deactivate, f }) => {
        await deactivate(f.studentId);

        const response = await get(`/users/${f.studentId}`);

        expect(response.status).toBe(200);
        expect(response.body.user).toEqual({
          id: f.studentId,
          username: 'ana_ivic',
          fullName: 'Ana Ivić',
          email: 'ana_ivic@example.com',
          role: 'student',
          activated: true,
          deactivatedAt: expect.any(String),
          createdAt: expect.any(String),
        });
        expect(JSON.stringify(response.body)).not.toMatch(/password|scrypt|school_?id/i);
      });
    });

    it('answers 404 for a user of another school, an unknown user and a bad id', async () => {
      await inApi(async ({ get, f }) => {
        for (const id of [f.otherSchoolStudentId, '00000000-0000-0000-0000-000000000000', 'nope']) {
          expect((await get(`/users/${id}`)).status).toBe(404);
        }
      });
    });

    it('answers 404 for a user whose data was erased', async () => {
      await inApi(async ({ get, post, deactivate, f }) => {
        await deactivate(f.studentId);
        await post('/users/delete', { ids: [f.studentId] });

        expect((await get(`/users/${f.studentId}`)).status).toBe(404);
      });
    });

    it('answers 403 for a user who is not an admin, and 401 for nobody', async () => {
      await inApi(async ({ app, signIn, f }) => {
        const cookie = sessionCookie(await signIn('jovan_jovanovic'));

        const response = await request(app).get(`/users/${f.studentId}`).set('Cookie', cookie);

        expect(response.status).toBe(403);
        expect((await request(app).get(`/users/${f.studentId}`)).status).toBe(401);
      });
    });
  });

  describe('PATCH /users/:id', () => {
    it('changes the name and keeps the username', async () => {
      await inApi(async ({ patch, f }) => {
        const response = await patch(`/users/${f.studentId}`, { fullName: '  Ana   Ivić ' });

        expect(response.status).toBe(200);
        expect(response.body.user).toMatchObject({ fullName: 'Ana Ivić', username: 'ana_ivic' });
      });
    });

    it.each([undefined, '', 'A', 'x'.repeat(101), 42])(
      'answers 400 for the name %j',
      async (fullName) => {
        await inApi(async ({ patch, f }) => {
          const response = await patch(`/users/${f.studentId}`, { fullName });

          expect(response.status).toBe(400);
          expect(response.body.error.code).toBe('invalid_full_name');
        });
      },
    );

    it('answers 404 for a user of another school, an unknown user and a bad id', async () => {
      await inApi(async ({ patch, f }) => {
        for (const id of [f.otherSchoolStudentId, '00000000-0000-0000-0000-000000000000', 'nope']) {
          const response = await patch(`/users/${id}`, { fullName: 'Novo Ime' });

          expect(response.status).toBe(404);
        }
      });
    });

    it('answers 403 for a user who is not an admin', async () => {
      await inApi(async ({ app, signIn, f }) => {
        const cookie = sessionCookie(await signIn('jovan_jovanovic'));

        const response = await request(app)
          .patch(`/users/${f.studentId}`)
          .set('Cookie', cookie)
          .send({ fullName: 'Novo Ime' });

        expect(response.status).toBe(403);
      });
    });
  });

  describe('POST /users/deactivate', () => {
    it('stops the user from signing in and keeps all their data', async () => {
      await inApi(async ({ deactivate, signIn, get, f }) => {
        const response = await deactivate(f.studentId);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ affectedIds: [f.studentId], skippedIds: [] });

        const login = await signIn('ana_ivic');
        expect(login.status).toBe(401);
        expect(login.body.error.code).toBe('invalid_credentials');
        expect((await signIn('ana_ivic@example.com')).status).toBe(401);

        const deactivated = await get('/users?status=deactivated');
        expect(deactivated.body.users).toHaveLength(1);
        expect(deactivated.body.users[0]).toMatchObject({
          id: f.studentId,
          email: 'ana_ivic@example.com',
          activated: true,
          deactivatedAt: expect.any(String),
        });
      });
    });

    it('ends the sessions the user already has', async () => {
      await inApi(async ({ app, signIn, deactivate, f }) => {
        const cookie = sessionCookie(await signIn('ana_ivic'));
        expect((await request(app).get('/auth/me').set('Cookie', cookie)).status).toBe(200);

        await deactivate(f.studentId);

        expect((await request(app).get('/auth/me').set('Cookie', cookie)).status).toBe(401);
      });
    });

    it('hides the user from the default list, but shows them with status=all', async () => {
      await inApi(async ({ get, deactivate, f }) => {
        await deactivate(f.studentId);

        expect(names(await get('/users'))).not.toContain('ana_ivic');
        expect(names(await get('/users?status=all'))).toContain('ana_ivic');
      });
    });

    it('can deactivate a whole class at once', async () => {
      await inApi(async ({ deactivate, get, f }) => {
        const response = await deactivate(f.studentId, f.notActivatedStudentId, f.parentId);

        expect(response.body.affectedIds.sort()).toEqual(
          [f.studentId, f.notActivatedStudentId, f.parentId].sort(),
        );
        expect((await get('/users?status=deactivated')).body.total).toBe(3);
      });
    });

    it('skips users of another school, unknown users and users already deactivated', async () => {
      await inApi(async ({ deactivate, f }) => {
        await deactivate(f.studentId);
        const unknown = '00000000-0000-0000-0000-000000000000';

        const response = await deactivate(f.studentId, f.otherSchoolStudentId, unknown, f.parentId);

        expect(response.body.affectedIds).toEqual([f.parentId]);
        expect(response.body.skippedIds.sort()).toEqual(
          [f.studentId, f.otherSchoolStudentId, unknown].sort(),
        );
      });
    });

    it('leaves users of another school untouched', async () => {
      await inApi(async ({ deactivate, client, f }) => {
        await deactivate(f.otherSchoolStudentId);

        const { rows } = await client.query<{ deactivated_at: Date | null }>(
          'SELECT deactivated_at FROM users WHERE id = $1',
          [f.otherSchoolStudentId],
        );
        expect(rows[0].deactivated_at).toBeNull();
      });
    });

    it('does not let an admin deactivate their own account', async () => {
      await inApi(async ({ deactivate, get, f }) => {
        const response = await deactivate(f.studentId, f.adminId);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('cannot_change_self');
        // Nobody in the list was changed either.
        expect((await get('/users?status=deactivated')).body.total).toBe(0);
      });
    });

    it('counts the same id once, whatever its letter case', async () => {
      await inApi(async ({ post, f }) => {
        const response = await post('/users/deactivate', {
          ids: [f.studentId, f.studentId.toUpperCase()],
        });

        expect(response.body).toEqual({ affectedIds: [f.studentId], skippedIds: [] });
      });
    });

    it.each([
      ['no ids', {}],
      ['an empty list', { ids: [] }],
      ['ids that are not a list', { ids: 'abc' }],
      ['an id that is not a uuid', { ids: ['not-a-uuid'] }],
      ['an id that is not text', { ids: [5] }],
      ['more than 200 ids', { ids: Array.from({ length: 201 }, () => crypto.randomUUID()) }],
    ])('answers 400 for %s', async (_name, body) => {
      await inApi(async ({ post }) => {
        const response = await post('/users/deactivate', body);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('invalid_request');
      });
    });

    it('answers 403 for a user who is not an admin', async () => {
      await inApi(async ({ app, signIn, f }) => {
        const cookie = sessionCookie(await signIn('jovan_jovanovic'));

        const response = await request(app)
          .post('/users/deactivate')
          .set('Cookie', cookie)
          .send({ ids: [f.studentId] });

        expect(response.status).toBe(403);
      });
    });

    it('refuses an activation link for a deactivated user', async () => {
      await inApi(async ({ deactivate, post, f }) => {
        await deactivate(f.studentId);

        const response = await post(`/users/${f.studentId}/activation`);

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe('user_deactivated');
      });
    });

    it('makes a link issued earlier stop working', async () => {
      await inApi(async ({ app, post, deactivate, f }) => {
        const issued = await post(`/users/${f.notActivatedStudentId}/activation`);
        const token = new URL(issued.body.activation.url).searchParams.get('token');
        await deactivate(f.notActivatedStudentId);

        const response = await request(app)
          .post('/auth/activate')
          .send({ token, password: 'nova-lozinka', email: 'marko@example.com' });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('invalid_activation_link');
      });
    });
  });

  describe('POST /users/reactivate', () => {
    it('lets the user sign in again', async () => {
      await inApi(async ({ deactivate, post, signIn, get, f }) => {
        await deactivate(f.studentId);

        const response = await post('/users/reactivate', { ids: [f.studentId] });

        expect(response.body).toEqual({ affectedIds: [f.studentId], skippedIds: [] });
        expect((await signIn('ana_ivic')).status).toBe(200);
        expect(names(await get('/users'))).toContain('ana_ivic');
      });
    });

    it('skips users who are not deactivated', async () => {
      await inApi(async ({ post, f }) => {
        const response = await post('/users/reactivate', { ids: [f.studentId] });

        expect(response.body).toEqual({ affectedIds: [], skippedIds: [f.studentId] });
      });
    });
  });

  describe('POST /users/delete', () => {
    const destroy = (api: Api, ...ids: string[]) => api.post('/users/delete', { ids });

    it('only deletes users who are deactivated first', async () => {
      await inApi(async (api) => {
        const response = await destroy(api, api.f.studentId);

        expect(response.body).toEqual({ affectedIds: [], skippedIds: [api.f.studentId] });
        expect(names(await api.get('/users'))).toContain('ana_ivic');
      });
    });

    it('erases the personal data and leaves an anonymous shell', async () => {
      await inApi(async (api) => {
        await api.deactivate(api.f.studentId);

        const response = await destroy(api, api.f.studentId);

        expect(response.body).toEqual({ affectedIds: [api.f.studentId], skippedIds: [] });
        const { rows } = await api.client.query(
          `SELECT full_name, username, email, password_hash, deactivated_at, deleted_at
           FROM users WHERE id = $1`,
          [api.f.studentId],
        );
        expect(rows[0]).toMatchObject({
          full_name: 'Deleted user',
          email: null,
          password_hash: null,
          deactivated_at: expect.any(Date),
          deleted_at: expect.any(Date),
        });
        expect(rows[0].username).toMatch(/^deleted_[0-9a-f]{12}$/);
      });
    });

    it('removes the user from every list and from sign-in', async () => {
      await inApi(async (api) => {
        await api.deactivate(api.f.studentId);
        await destroy(api, api.f.studentId);

        const all = names(await api.get('/users?status=all'));
        expect(all).not.toContain('ana_ivic');
        expect(all.some((name) => name.startsWith('deleted_'))).toBe(false);
        expect((await api.signIn('ana_ivic')).status).toBe(401);
        expect((await api.signIn('ana_ivic@example.com')).status).toBe(401);
      });
    });

    it('frees the username and the email for a correction', async () => {
      await inApi(async (api) => {
        await api.deactivate(api.f.studentId);
        await destroy(api, api.f.studentId);

        const created = await api.post('/users', { fullName: 'Ana Ivić', role: 'student' });

        expect(created.body.user.username).toBe('ana_ivic');
        const { rows } = await api.client.query(
          "SELECT 1 FROM users WHERE email = 'ana_ivic@example.com'",
        );
        expect(rows).toHaveLength(0);
      });
    });

    it("removes sessions, activation links, the student's requests and family links", async () => {
      await inApi(async (api) => {
        const { client, f } = api;
        const subjectId = await insertSubject(
          client,
          f.schoolId,
          await insertClass(client, f.schoolId),
          f.teacherId,
        );
        await insertParentStudent(client, f.schoolId, f.parentId, f.studentId, f.adminId);
        await insertEnrollment(client, {
          schoolId: f.schoolId,
          studentId: f.studentId,
          subjectId,
          requestedBy: f.studentId,
          requestedByRole: 'student',
        });
        await api.signIn('ana_ivic');
        await api.post(`/users/${f.studentId}/activation`);
        await api.deactivate(f.studentId);

        await destroy(api, f.studentId);

        const count = async (table: string, column: string) =>
          (
            await client.query<{ count: string }>(
              `SELECT count(*) FROM ${table} WHERE ${column} = $1`,
              [f.studentId],
            )
          ).rows[0].count;
        expect(await count('sessions', 'user_id')).toBe('0');
        expect(await count('activation_tokens', 'user_id')).toBe('0');
        expect(await count('enrollments', 'student_id')).toBe('0');
        expect(await count('parent_students', 'student_id')).toBe('0');
      });
    });

    it('keeps an enrollment that a deleted parent confirmed, with the parent made anonymous', async () => {
      await inApi(async (api) => {
        const { client, f } = api;
        const subjectId = await insertSubject(
          client,
          f.schoolId,
          await insertClass(client, f.schoolId),
          f.teacherId,
        );
        await insertParentStudent(client, f.schoolId, f.parentId, f.studentId, f.adminId);
        await insertEnrollment(client, {
          schoolId: f.schoolId,
          studentId: f.studentId,
          subjectId,
          requestedBy: f.studentId,
          requestedByRole: 'student',
          status: 'awaiting_teacher',
          parentDecidedBy: f.parentId,
        });
        await api.deactivate(f.parentId);

        const response = await destroy(api, f.parentId);

        expect(response.body.affectedIds).toEqual([f.parentId]);
        const { rows } = await client.query<{ status: string; parent_decided_by: string }>(
          'SELECT status, parent_decided_by FROM enrollments WHERE student_id = $1',
          [f.studentId],
        );
        expect(rows).toEqual([{ status: 'awaiting_teacher', parent_decided_by: f.parentId }]);
      });
    });

    it('still removes the links of a deleted parent that no enrollment depends on', async () => {
      await inApi(async (api) => {
        const { client, f } = api;
        await insertParentStudent(client, f.schoolId, f.parentId, f.studentId, f.adminId);
        await api.deactivate(f.parentId);

        await destroy(api, f.parentId);

        const { rows } = await client.query('SELECT 1 FROM parent_students');
        expect(rows).toHaveLength(0);
      });
    });

    it('keeps the subjects of a deleted teacher', async () => {
      await inApi(async (api) => {
        const { client, f } = api;
        const subjectId = await insertSubject(
          client,
          f.schoolId,
          await insertClass(client, f.schoolId),
          f.teacherId,
        );
        await api.deactivate(f.teacherId);

        await destroy(api, f.teacherId);

        const { rows } = await client.query<{ teacher_id: string }>(
          'SELECT teacher_id FROM subjects WHERE id = $1',
          [subjectId],
        );
        expect(rows).toEqual([{ teacher_id: f.teacherId }]);
      });
    });

    it('skips users of another school and users that are already deleted', async () => {
      await inApi(async (api) => {
        await api.deactivate(api.f.studentId);
        await destroy(api, api.f.studentId);

        const response = await destroy(api, api.f.studentId, api.f.otherSchoolStudentId);

        expect(response.body.affectedIds).toEqual([]);
        expect(response.body.skippedIds.sort()).toEqual(
          [api.f.studentId, api.f.otherSchoolStudentId].sort(),
        );
      });
    });

    it('cannot be undone: a deleted user cannot be reactivated, renamed or sent a link', async () => {
      await inApi(async (api) => {
        const { f } = api;
        await api.deactivate(f.studentId);
        await destroy(api, f.studentId);

        const reactivated = await api.post('/users/reactivate', { ids: [f.studentId] });
        const renamed = await api.patch(`/users/${f.studentId}`, { fullName: 'Novo Ime' });
        const link = await api.post(`/users/${f.studentId}/activation`);

        expect(reactivated.body.affectedIds).toEqual([]);
        expect(renamed.status).toBe(404);
        expect(link.status).toBe(404);
      });
    });

    it('does not let an admin delete their own account', async () => {
      await inApi(async (api) => {
        const response = await destroy(api, api.f.adminId);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('cannot_change_self');
      });
    });

    it('answers 403 for a user who is not an admin', async () => {
      await inApi(async (api) => {
        const cookie = sessionCookie(await api.signIn('jovan_jovanovic'));

        const response = await request(api.app)
          .post('/users/delete')
          .set('Cookie', cookie)
          .send({ ids: [api.f.studentId] });

        expect(response.status).toBe(403);
      });
    });
  });

  describe('the database', () => {
    it('refuses a deleted user who is not deactivated', async () => {
      await inApi(async ({ client, f }) => {
        await expect(
          client.query('UPDATE users SET deleted_at = now() WHERE id = $1', [f.studentId]),
        ).rejects.toThrow(/violates check constraint/);
      });
    });
  });
});

import type pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPool } from '../db/pool.ts';
import { insertActivatedUser, insertParentStudent, insertUser } from '../db/testUtils.ts';
import { inApi as runWithApi, PASSWORD, type Api } from './testApi.ts';

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('GET /children', () => {
  // Created in beforeAll because describe bodies run even when the suite is skipped.
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  const inApi = (run: (api: Api) => Promise<void>) => runWithApi(pool, run);

  const names = (response: request.Response) =>
    (response.body.children as { fullName: string }[]).map((child) => child.fullName);

  it('lists the children of the signed-in parent, with only an id and a name, by name', async () => {
    await inApi(async (api) => {
      const { client, f } = api;
      const second = await insertActivatedUser(client, f.schoolId, 'student', {
        username: 'bojan_ivic',
        email: 'bojan@example.com',
        password: PASSWORD,
        fullName: 'Bojan Ivić',
      });
      await insertParentStudent(client, f.schoolId, f.parentId, second, f.adminId);
      await insertParentStudent(client, f.schoolId, f.parentId, f.studentId, f.adminId);

      const response = await (await api.as('petar_ivic')).get('/children');

      expect(response.status).toBe(200);
      expect(response.body.children).toEqual([
        { id: f.studentId, fullName: 'Ana Ivić' },
        { id: second, fullName: 'Bojan Ivić' },
      ]);
    });
  });

  it('answers with an empty list for a parent without children', async () => {
    await inApi(async (api) => {
      const response = await (await api.as('petar_ivic')).get('/children');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ children: [] });
    });
  });

  it('shows only the children of this parent, not those of another parent or school', async () => {
    await inApi(async (api) => {
      const { client, f } = api;
      const otherParent = await insertActivatedUser(client, f.schoolId, 'parent', {
        username: 'mira_ivic',
        email: 'mira@example.com',
        password: PASSWORD,
        fullName: 'Mira Ivić',
      });
      await insertParentStudent(client, f.schoolId, otherParent, f.studentId, f.adminId);
      // A child of another school is never linked to this parent, whatever its name.
      await insertUser(client, f.otherSchoolId, 'student', 'tudji_ucenik_2');

      const mine = await (await api.as('petar_ivic')).get('/children');
      const hers = await (await api.as('mira_ivic')).get('/children');

      expect(names(mine)).toEqual([]);
      expect(names(hers)).toEqual(['Ana Ivić']);
    });
  });

  it('leaves out a child who left the school or whose data was erased', async () => {
    await inApi(async (api) => {
      const { client, f } = api;
      await insertParentStudent(client, f.schoolId, f.parentId, f.studentId, f.adminId);
      const erased = await insertActivatedUser(client, f.schoolId, 'student', {
        username: 'cvetko_ivic',
        email: 'cvetko@example.com',
        password: PASSWORD,
        fullName: 'Cvetko Ivić',
      });
      await insertParentStudent(client, f.schoolId, f.parentId, erased, f.adminId);

      await api.deactivate(f.studentId);
      await client.query(
        'UPDATE users SET deactivated_at = now(), deleted_at = now() WHERE id = $1',
        [erased],
      );

      const response = await (await api.as('petar_ivic')).get('/children');

      expect(response.body).toEqual({ children: [] });
    });
  });

  it.each(['admin_a', 'jovan_jovanovic', 'ana_ivic'])(
    'answers 403 for %s, who is not a parent',
    async (username) => {
      await inApi(async (api) => {
        const response = await (await api.as(username)).get('/children');
        expect(response.status).toBe(403);
      });
    },
  );

  it('answers 401 when nobody is signed in', async () => {
    await inApi(async ({ app }) => {
      expect((await request(app).get('/children')).status).toBe(401);
    });
  });
});

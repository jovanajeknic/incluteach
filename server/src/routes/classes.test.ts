import type pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPool } from '../db/pool.ts';
import { insertClass, insertSubject } from '../db/testUtils.ts';
import { inApi as runWithApi, type Api } from './testApi.ts';

const NOT_ADMINS = ['ana_ivic', 'jovan_jovanovic', 'petar_ivic'];

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('classes', () => {
  // Created in beforeAll because describe bodies run even when the suite is skipped.
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  const inApi = (run: (api: Api) => Promise<void>) => runWithApi(pool, run);

  const classNames = (response: request.Response) =>
    (response.body.classes as { name: string }[]).map((item) => item.name);

  describe('POST /classes', () => {
    it("creates a class in the admin's school", async () => {
      await inApi(async ({ post }) => {
        const response = await post('/classes', { name: '5-2', schoolYear: 2026 });

        expect(response.status).toBe(201);
        expect(response.body.class).toEqual({
          id: expect.any(String),
          name: '5-2',
          schoolYear: 2026,
          subjectCount: 0,
          createdAt: expect.any(String),
        });
      });
    });

    it('tidies spaces in the name', async () => {
      await inApi(async ({ post }) => {
        const response = await post('/classes', { name: '  5   razred  A ', schoolYear: 2026 });

        expect(response.body.class.name).toBe('5 razred A');
      });
    });

    it('allows the same name in another school year or another school', async () => {
      await inApi(async ({ post, client, f }) => {
        await insertClass(client, f.otherSchoolId, '5-2', 2026);
        await post('/classes', { name: '5-2', schoolYear: 2026 });

        expect((await post('/classes', { name: '5-2', schoolYear: 2027 })).status).toBe(201);
        expect((await post('/classes', { name: '5-3', schoolYear: 2026 })).status).toBe(201);
      });
    });

    it('refuses the same name in the same school year, whatever the letter case', async () => {
      await inApi(async ({ post }) => {
        await post('/classes', { name: '5-A', schoolYear: 2026 });

        for (const name of ['5-A', '5-a', ' 5-A ']) {
          const response = await post('/classes', { name, schoolYear: 2026 });

          expect(response.status).toBe(409);
          expect(response.body.error.code).toBe('class_exists');
        }
      });
    });

    it.each([
      ['no name', { schoolYear: 2026 }],
      ['an empty name', { name: '', schoolYear: 2026 }],
      ['a blank name', { name: '   ', schoolYear: 2026 }],
      ['a name above 50 characters', { name: 'x'.repeat(51), schoolYear: 2026 }],
      ['a name that is not text', { name: 52, schoolYear: 2026 }],
    ])('answers 400 for %s', async (_name, body) => {
      await inApi(async ({ post }) => {
        const response = await post('/classes', body);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('invalid_class_name');
      });
    });

    it.each([
      ['no school year', {}],
      ['a year before 2000', { schoolYear: 1999 }],
      ['a year after 2100', { schoolYear: 2101 }],
      ['a year written as text', { schoolYear: '2026' }],
      ['a year with decimals', { schoolYear: 2026.5 }],
    ])('answers 400 for %s', async (_name, change) => {
      await inApi(async ({ post }) => {
        const response = await post('/classes', { name: '5-2', ...change });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('invalid_school_year');
      });
    });

    it('answers 401 when nobody is signed in', async () => {
      await inApi(async ({ app }) => {
        const response = await request(app)
          .post('/classes')
          .send({ name: '5-2', schoolYear: 2026 });

        expect(response.status).toBe(401);
      });
    });

    it.each(NOT_ADMINS)('answers 403 for %s, who is not an admin', async (username) => {
      await inApi(async ({ as }) => {
        const response = await (
          await as(username)
        ).post('/classes', { name: '5-2', schoolYear: 2026 });

        expect(response.status).toBe(403);
      });
    });
  });

  describe('GET /classes', () => {
    it('lists the classes of the school, newest school year first and then by name', async () => {
      await inApi(async ({ get, client, f }) => {
        await insertClass(client, f.schoolId, '6-1', 2026);
        await insertClass(client, f.schoolId, '5-2', 2026);
        await insertClass(client, f.schoolId, '9-1', 2025);
        await insertClass(client, f.otherSchoolId, '1-1', 2026);

        const response = await get('/classes');

        expect(response.status).toBe(200);
        expect(classNames(response)).toEqual(['5-2', '6-1', '9-1']);
        expect(response.body.classes.map((c: { schoolYear: number }) => c.schoolYear)).toEqual([
          2026, 2026, 2025,
        ]);
      });
    });

    it('shows only one school year when asked', async () => {
      await inApi(async ({ get, client, f }) => {
        await insertClass(client, f.schoolId, '5-2', 2026);
        await insertClass(client, f.schoolId, '9-1', 2025);

        expect(classNames(await get('/classes?schoolYear=2025'))).toEqual(['9-1']);
        expect(classNames(await get('/classes?schoolYear=2030'))).toEqual([]);
      });
    });

    it('counts the subjects of each class', async () => {
      await inApi(async ({ get, client, f }) => {
        const withSubjects = await insertClass(client, f.schoolId, '5-2', 2026);
        await insertClass(client, f.schoolId, '6-1', 2026);
        await insertSubject(client, f.schoolId, withSubjects, f.teacherId, 'Matematika');
        await insertSubject(client, f.schoolId, withSubjects, f.teacherId, 'Fizika');

        const { classes } = (await get('/classes')).body;

        expect(
          classes.map((c: { name: string; subjectCount: number }) => [c.name, c.subjectCount]),
        ).toEqual([
          ['5-2', 2],
          ['6-1', 0],
        ]);
      });
    });

    it.each(['abc', '1999', '2101', '-1', '2026.5'])(
      'answers 400 for the school year "%s"',
      async (value) => {
        await inApi(async ({ get }) => {
          const response = await get(`/classes?schoolYear=${value}`);

          expect(response.status).toBe(400);
          expect(response.body.error.code).toBe('invalid_request');
        });
      },
    );

    it.each(NOT_ADMINS)('answers 403 for %s, who is not an admin', async (username) => {
      await inApi(async ({ as }) => {
        expect((await (await as(username)).get('/classes')).status).toBe(403);
      });
    });
  });

  describe('PATCH /classes/:id', () => {
    it('renames a class and keeps its school year', async () => {
      await inApi(async ({ patch, client, f }) => {
        const id = await insertClass(client, f.schoolId, '5-2', 2026);

        const response = await patch(`/classes/${id}`, { name: ' 5-3 ' });

        expect(response.status).toBe(200);
        expect(response.body.class).toMatchObject({ id, name: '5-3', schoolYear: 2026 });
      });
    });

    it('allows changing only the letter case of the name', async () => {
      await inApi(async ({ patch, client, f }) => {
        const id = await insertClass(client, f.schoolId, '5-a', 2026);

        const response = await patch(`/classes/${id}`, { name: '5-A' });

        expect(response.status).toBe(200);
        expect(response.body.class.name).toBe('5-A');
      });
    });

    it('refuses a name another class of that school year already has', async () => {
      await inApi(async ({ patch, client, f }) => {
        await insertClass(client, f.schoolId, '5-3', 2026);
        const id = await insertClass(client, f.schoolId, '5-2', 2026);

        const response = await patch(`/classes/${id}`, { name: '5-3' });

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe('class_exists');
      });
    });

    it('allows a name that only exists in another school year', async () => {
      await inApi(async ({ patch, client, f }) => {
        await insertClass(client, f.schoolId, '5-3', 2025);
        const id = await insertClass(client, f.schoolId, '5-2', 2026);

        expect((await patch(`/classes/${id}`, { name: '5-3' })).status).toBe(200);
      });
    });

    it.each([undefined, '', '   ', 'x'.repeat(51), 7])(
      'answers 400 for the name %j',
      async (name) => {
        await inApi(async ({ patch, client, f }) => {
          const id = await insertClass(client, f.schoolId, '5-2', 2026);

          const response = await patch(`/classes/${id}`, { name });

          expect(response.status).toBe(400);
          expect(response.body.error.code).toBe('invalid_class_name');
        });
      },
    );

    it('answers 404 for a class of another school, an unknown class and a bad id', async () => {
      await inApi(async ({ patch, client, f }) => {
        const otherId = await insertClass(client, f.otherSchoolId, '5-2', 2026);

        for (const id of [otherId, '00000000-0000-0000-0000-000000000000', 'nope']) {
          expect((await patch(`/classes/${id}`, { name: 'Novo' })).status).toBe(404);
        }
      });
    });

    it.each(NOT_ADMINS)('answers 403 for %s, who is not an admin', async (username) => {
      await inApi(async ({ as, client, f }) => {
        const id = await insertClass(client, f.schoolId, '5-2', 2026);

        expect((await (await as(username)).patch(`/classes/${id}`, { name: 'Novo' })).status).toBe(
          403,
        );
      });
    });
  });

  describe('DELETE /classes/:id', () => {
    it('deletes a class without subjects', async () => {
      await inApi(async ({ delete: remove, get, client, f }) => {
        const id = await insertClass(client, f.schoolId, '5-2', 2026);

        const response = await remove(`/classes/${id}`);

        expect(response.status).toBe(204);
        expect(classNames(await get('/classes'))).toEqual([]);
      });
    });

    it('refuses to delete a class that has subjects', async () => {
      await inApi(async ({ delete: remove, get, client, f }) => {
        const id = await insertClass(client, f.schoolId, '5-2', 2026);
        await insertSubject(client, f.schoolId, id, f.teacherId);

        const response = await remove(`/classes/${id}`);

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe('class_not_empty');
        expect(classNames(await get('/classes'))).toEqual(['5-2']);
      });
    });

    it('answers 404 for a class of another school, an unknown class and a bad id', async () => {
      await inApi(async ({ delete: remove, client, f }) => {
        const otherId = await insertClass(client, f.otherSchoolId, '5-2', 2026);

        for (const id of [otherId, '00000000-0000-0000-0000-000000000000', 'nope']) {
          expect((await remove(`/classes/${id}`)).status).toBe(404);
        }
        const { rows } = await client.query('SELECT 1 FROM classes WHERE id = $1', [otherId]);
        expect(rows).toHaveLength(1);
      });
    });

    it.each(NOT_ADMINS)('answers 403 for %s, who is not an admin', async (username) => {
      await inApi(async ({ as, client, f }) => {
        const id = await insertClass(client, f.schoolId, '5-2', 2026);

        expect((await (await as(username)).delete(`/classes/${id}`)).status).toBe(403);
      });
    });
  });
});

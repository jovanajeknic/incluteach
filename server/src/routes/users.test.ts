import type pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../app.ts';
import { createPool } from '../db/pool.ts';
import { inRolledBackTransaction, insertActivatedUser, insertSchool } from '../db/testUtils.ts';
import { sessionCookie } from './testHelpers.ts';

const PASSWORD = 'tajna-lozinka';

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('POST /users', () => {
  // Created in beforeAll because describe bodies run even when the suite is skipped.
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  type App = ReturnType<typeof createApp>;

  // Each test runs against one connection inside a transaction that is rolled back,
  // and gets a fresh app, so no data and no rate limit counters carry over.
  function inApp(run: (app: App, client: pg.PoolClient, schoolId: string) => Promise<void>) {
    return inRolledBackTransaction(pool, async (client) => {
      const schoolId = await insertSchool(client);
      await insertActivatedUser(client, schoolId, 'admin', {
        username: 'admin_a',
        email: 'admin@example.com',
        password: PASSWORD,
      });
      await run(createApp({ pool: client }), client, schoolId);
    });
  }

  async function adminCookie(app: App): Promise<string> {
    const response = await request(app)
      .post('/auth/login')
      .send({ identifier: 'admin_a', password: PASSWORD });
    return sessionCookie(response);
  }

  const create = async (app: App, body: unknown) =>
    request(app)
      .post('/users')
      .set('Cookie', await adminCookie(app))
      .send(body as object);

  it.each(['teacher', 'student', 'parent'] as const)(
    "creates a %s in the admin's school",
    async (role) => {
      await inApp(async (app, _client, schoolId) => {
        const response = await create(app, { fullName: 'Ana Ivić', role });

        expect(response.status).toBe(201);
        expect(response.body.user).toMatchObject({
          username: 'ana_ivic',
          fullName: 'Ana Ivić',
          email: null,
          role,
          schoolId,
        });
        expect(response.body.user.id).toBeTruthy();
        expect(JSON.stringify(response.body)).not.toMatch(/password|scrypt/i);
      });
    },
  );

  it('numbers the username of a second person with the same name', async () => {
    await inApp(async (app) => {
      const first = await create(app, { fullName: 'Marko Marković', role: 'student' });
      const second = await create(app, { fullName: 'Marko Marković', role: 'student' });

      expect(first.body.user.username).toBe('marko_markovic');
      expect(second.body.user.username).toBe('marko_markovic2');
    });
  });

  it('tidies spaces in the name', async () => {
    await inApp(async (app) => {
      const response = await create(app, { fullName: '  Ana    Ivić ', role: 'student' });

      expect(response.body.user.fullName).toBe('Ana Ivić');
    });
  });

  it('gives an account that cannot sign in yet', async () => {
    await inApp(async (app) => {
      await create(app, { fullName: 'Ana Ivić', role: 'student' });

      const response = await request(app)
        .post('/auth/login')
        .send({ identifier: 'ana_ivic', password: PASSWORD });

      expect(response.status).toBe(401);
    });
  });

  it('answers 401 when nobody is signed in', async () => {
    await inApp(async (app) => {
      const response = await request(app)
        .post('/users')
        .send({ fullName: 'Ana Ivić', role: 'student' });

      expect(response.status).toBe(401);
    });
  });

  it.each(['teacher', 'student', 'parent'] as const)(
    'answers 403 for a user with the role "%s"',
    async (role) => {
      await inApp(async (app, client, schoolId) => {
        await insertActivatedUser(client, schoolId, role, {
          username: 'neko_drugi',
          email: 'drugi@example.com',
          password: PASSWORD,
        });
        const login = await request(app)
          .post('/auth/login')
          .send({ identifier: 'neko_drugi', password: PASSWORD });

        const response = await request(app)
          .post('/users')
          .set('Cookie', sessionCookie(login))
          .send({ fullName: 'Ana Ivić', role: 'student' });

        expect(response.status).toBe(403);
      });
    },
  );

  it.each([
    ['an admin as the role', { fullName: 'Ana Ivić', role: 'admin' }, 'invalid_role'],
    ['an unknown role', { fullName: 'Ana Ivić', role: 'principal' }, 'invalid_role'],
    ['a missing role', { fullName: 'Ana Ivić' }, 'invalid_role'],
    ['a role that is not text', { fullName: 'Ana Ivić', role: 5 }, 'invalid_role'],
    ['a missing name', { role: 'student' }, 'invalid_full_name'],
    ['a blank name', { fullName: '    ', role: 'student' }, 'invalid_full_name'],
    ['a one-letter name', { fullName: 'A', role: 'student' }, 'invalid_full_name'],
    [
      'a name that is too long',
      { fullName: 'A'.repeat(101), role: 'student' },
      'invalid_full_name',
    ],
    ['a name without letters', { fullName: '### !!!', role: 'student' }, 'invalid_full_name'],
    ['a name that is not text', { fullName: 12345, role: 'student' }, 'invalid_full_name'],
  ])('answers 400 for %s', async (_name, body, code) => {
    await inApp(async (app, client) => {
      const response = await create(app, body);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe(code);
      // Only the admin created in the test setup exists.
      const { rows } = await client.query('SELECT 1 FROM users');
      expect(rows).toHaveLength(1);
    });
  });
});

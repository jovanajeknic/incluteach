import type pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../app.ts';
import { hashToken } from '../auth/sessions.ts';
import { createPool } from '../db/pool.ts';
import {
  inRolledBackTransaction,
  insertActivatedUser,
  insertSchool,
  insertUser,
} from '../db/testUtils.ts';
import { sessionCookie } from './testHelpers.ts';

const PASSWORD = 'tajna-lozinka';
const NEW_PASSWORD = 'nova-lozinka-123';
const PUBLIC_URL = 'https://skola.example.com';

interface Fixture {
  schoolId: string;
  adminId: string;
  studentId: string;
  activatedStudentId: string;
  otherSchoolUserId: string;
}

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('activation links', () => {
  // Created in beforeAll because describe bodies run even when the suite is skipped.
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  type App = ReturnType<typeof createApp>;

  // Each test runs against one connection inside a transaction that is rolled back,
  // and gets a fresh app, so no data and no rate limit counters carry over.
  function inApp(run: (app: App, client: pg.PoolClient, f: Fixture) => Promise<void>) {
    return inRolledBackTransaction(pool, async (client) => {
      const schoolId = await insertSchool(client, 'School A');
      const adminId = await insertActivatedUser(client, schoolId, 'admin', {
        username: 'admin_a',
        email: 'admin@example.com',
        password: PASSWORD,
      });
      const studentId = await insertUser(client, schoolId, 'student', 'novi_ucenik');
      const activatedStudentId = await insertActivatedUser(client, schoolId, 'student', {
        username: 'stari_ucenik',
        email: 'stari@example.com',
        password: PASSWORD,
      });
      const otherSchoolId = await insertSchool(client, 'School B');
      const otherSchoolUserId = await insertUser(client, otherSchoolId, 'student', 'tudji_ucenik');

      await run(createApp({ pool: client, publicUrl: PUBLIC_URL }), client, {
        schoolId,
        adminId,
        studentId,
        activatedStudentId,
        otherSchoolUserId,
      });
    });
  }

  const login = (app: App, identifier: string, password: string) =>
    request(app).post('/auth/login').send({ identifier, password });

  async function adminCookie(app: App): Promise<string> {
    return sessionCookie(await login(app, 'admin_a', PASSWORD));
  }

  // The admin asks for a link; returns the token from it.
  async function issueToken(app: App, userId: string): Promise<string> {
    const response = await request(app)
      .post(`/users/${userId}/activation`)
      .set('Cookie', await adminCookie(app));
    expect(response.status).toBe(201);
    const token = new URL(response.body.activation.url).searchParams.get('token');
    expect(token).toBeTruthy();
    return token as string;
  }

  const activate = (app: App, body: object) => request(app).post('/auth/activate').send(body);

  const validBody = (token: string) => ({
    token,
    password: NEW_PASSWORD,
    email: 'ucenik@example.com',
  });

  describe('POST /users/:id/activation', () => {
    it('gives an admin a link for a user of their own school', async () => {
      await inApp(async (app, client, f) => {
        const response = await request(app)
          .post(`/users/${f.studentId}/activation`)
          .set('Cookie', await adminCookie(app));

        expect(response.status).toBe(201);
        expect(response.headers['cache-control']).toBe('no-store');
        const url = new URL(response.body.activation.url);
        expect(url.origin).toBe(PUBLIC_URL);
        expect(url.pathname).toBe('/activate');
        const token = url.searchParams.get('token') as string;
        expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);

        const days =
          (Date.parse(response.body.activation.expiresAt) - Date.now()) / (24 * 60 * 60 * 1000);
        expect(days).toBeGreaterThan(6.99);
        expect(days).toBeLessThanOrEqual(7);

        // Only a hash is stored, and the record says who created it.
        const { rows } = await client.query<{ token_hash: string; created_by: string }>(
          'SELECT token_hash, created_by FROM activation_tokens WHERE user_id = $1',
          [f.studentId],
        );
        expect(rows).toEqual([{ token_hash: hashToken(token), created_by: f.adminId }]);
      });
    });

    it('also works for a user who is already active, for a forgotten password', async () => {
      await inApp(async (app, _client, f) => {
        const response = await request(app)
          .post(`/users/${f.activatedStudentId}/activation`)
          .set('Cookie', await adminCookie(app));

        expect(response.status).toBe(201);
      });
    });

    it('cancels the previous link when a new one is issued', async () => {
      await inApp(async (app, _client, f) => {
        const oldToken = await issueToken(app, f.studentId);
        const newToken = await issueToken(app, f.studentId);

        const withOld = await activate(app, validBody(oldToken));
        expect(withOld.status).toBe(400);
        expect(withOld.body.error.code).toBe('invalid_activation_link');
        expect((await activate(app, validBody(newToken))).status).toBe(200);
      });
    });

    it('answers 401 when nobody is signed in', async () => {
      await inApp(async (app, _client, f) => {
        const response = await request(app).post(`/users/${f.studentId}/activation`);

        expect(response.status).toBe(401);
      });
    });

    it.each(['teacher', 'student', 'parent'] as const)(
      'answers 403 for a user with the role "%s"',
      async (role) => {
        await inApp(async (app, client, f) => {
          await insertActivatedUser(client, f.schoolId, role, {
            username: 'neko_drugi',
            email: 'drugi@example.com',
            password: PASSWORD,
          });
          const cookie = sessionCookie(await login(app, 'neko_drugi', PASSWORD));

          const response = await request(app)
            .post(`/users/${f.studentId}/activation`)
            .set('Cookie', cookie);

          expect(response.status).toBe(403);
        });
      },
    );

    it('answers 404 for a user of another school, as if the user did not exist', async () => {
      await inApp(async (app, client, f) => {
        const response = await request(app)
          .post(`/users/${f.otherSchoolUserId}/activation`)
          .set('Cookie', await adminCookie(app));

        expect(response.status).toBe(404);
        const { rows } = await client.query('SELECT 1 FROM activation_tokens');
        expect(rows).toHaveLength(0);
      });
    });

    it.each(['00000000-0000-0000-0000-000000000000', 'not-a-uuid', '12345'])(
      'answers 404 for the user id "%s"',
      async (id) => {
        await inApp(async (app) => {
          const response = await request(app)
            .post(`/users/${id}/activation`)
            .set('Cookie', await adminCookie(app));

          expect(response.status).toBe(404);
        });
      },
    );
  });

  describe('POST /auth/activate', () => {
    it('sets the password and email, and signs the user in', async () => {
      await inApp(async (app, client, f) => {
        const token = await issueToken(app, f.studentId);

        const response = await activate(app, validBody(token));

        expect(response.status).toBe(200);
        expect(response.headers['cache-control']).toBe('no-store');
        expect(response.body.user).toMatchObject({
          id: f.studentId,
          username: 'novi_ucenik',
          email: 'ucenik@example.com',
          role: 'student',
          schoolId: f.schoolId,
        });
        expect(JSON.stringify(response.body)).not.toMatch(/password|scrypt/i);

        const me = await request(app).get('/auth/me').set('Cookie', sessionCookie(response));
        expect(me.body.user.id).toBe(f.studentId);

        const { rows } = await client.query<{ used: boolean }>(
          'SELECT used_at IS NOT NULL AS used FROM activation_tokens WHERE user_id = $1',
          [f.studentId],
        );
        expect(rows).toEqual([{ used: true }]);
      });
    });

    it('lets the user sign in afterwards with the username or the email', async () => {
      await inApp(async (app, _client, f) => {
        await activate(app, validBody(await issueToken(app, f.studentId)));

        expect((await login(app, 'novi_ucenik', NEW_PASSWORD)).status).toBe(200);
        expect((await login(app, 'UCENIK@example.com', NEW_PASSWORD)).status).toBe(200);
        expect((await login(app, 'novi_ucenik', 'pogresna-lozinka')).status).toBe(401);
      });
    });

    it('trims spaces around the email', async () => {
      await inApp(async (app, _client, f) => {
        const token = await issueToken(app, f.studentId);

        const response = await activate(app, {
          ...validBody(token),
          email: '  ucenik@example.com ',
        });

        expect(response.body.user.email).toBe('ucenik@example.com');
      });
    });

    it('cannot be used twice', async () => {
      await inApp(async (app, _client, f) => {
        const token = await issueToken(app, f.studentId);
        await activate(app, validBody(token));

        const second = await activate(app, {
          ...validBody(token),
          password: 'napadac-lozinka',
          email: 'napadac@example.com',
        });

        expect(second.status).toBe(400);
        expect(second.body.error.code).toBe('invalid_activation_link');
        expect((await login(app, 'novi_ucenik', 'napadac-lozinka')).status).toBe(401);
      });
    });

    it('does not work after it expired', async () => {
      await inApp(async (app, client, f) => {
        const token = await issueToken(app, f.studentId);
        await client.query(
          `UPDATE activation_tokens SET created_at = now() - interval '8 days',
             expires_at = now() - interval '1 day'`,
        );

        const response = await activate(app, validBody(token));

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('invalid_activation_link');
      });
    });

    it.each(['made-up-token', '', 'a'.repeat(43)])(
      'does not work with the unknown token "%s"',
      async (token) => {
        await inApp(async (app) => {
          const response = await activate(app, validBody(token));

          expect(response.status).toBe(400);
          expect(response.body.error.code).toBe('invalid_activation_link');
        });
      },
    );

    it.each([
      ['no email', { email: undefined }, 'invalid_request'],
      ['no password', { password: undefined }, 'invalid_request'],
      ['no token', { token: undefined }, 'invalid_request'],
      ['numbers instead of text', { password: 123456789 }, 'invalid_request'],
      ['an email without a domain', { email: 'ucenik@' }, 'invalid_email'],
      ['a blank email', { email: '   ' }, 'invalid_email'],
      ['a password of 6 characters', { password: 'abcdef' }, 'password_too_short'],
      ['a password above 128 characters', { password: 'a'.repeat(129) }, 'password_too_long'],
    ])('rejects %s without using up the link', async (_name, change, code) => {
      await inApp(async (app, _client, f) => {
        const token = await issueToken(app, f.studentId);

        const rejected = await activate(app, { ...validBody(token), ...change });
        expect(rejected.status).toBe(400);
        expect(rejected.body.error.code).toBe(code);

        // The link still works afterwards.
        expect((await activate(app, validBody(token))).status).toBe(200);
      });
    });

    it('accepts a password of exactly 7 characters', async () => {
      await inApp(async (app, _client, f) => {
        const token = await issueToken(app, f.studentId);

        expect((await activate(app, { ...validBody(token), password: 'abcdefg' })).status).toBe(
          200,
        );
      });
    });

    it('refuses an email used by another account, whatever the letter case, and keeps the link', async () => {
      await inApp(async (app, _client, f) => {
        const token = await issueToken(app, f.studentId);

        const taken = await activate(app, { ...validBody(token), email: 'ADMIN@example.com' });
        expect(taken.status).toBe(409);
        expect(taken.body.error.code).toBe('email_taken');

        expect((await activate(app, validBody(token))).status).toBe(200);
      });
    });

    it('lets a user who forgot the password reuse their own email', async () => {
      await inApp(async (app, _client, f) => {
        const token = await issueToken(app, f.activatedStudentId);

        const response = await activate(app, {
          token,
          password: NEW_PASSWORD,
          email: 'stari@example.com',
        });

        expect(response.status).toBe(200);
      });
    });

    it('replaces the old password and ends the old sessions when resetting a password', async () => {
      await inApp(async (app, _client, f) => {
        const oldCookie = sessionCookie(await login(app, 'stari_ucenik', PASSWORD));
        const token = await issueToken(app, f.activatedStudentId);

        await activate(app, { token, password: NEW_PASSWORD, email: 'stari@example.com' });

        expect((await request(app).get('/auth/me').set('Cookie', oldCookie)).status).toBe(401);
        expect((await login(app, 'stari_ucenik', PASSWORD)).status).toBe(401);
        expect((await login(app, 'stari_ucenik', NEW_PASSWORD)).status).toBe(200);
      });
    });

    it('limits failed attempts from one address', async () => {
      await inApp(async (app) => {
        for (let attempt = 1; attempt <= 30; attempt += 1) {
          expect((await activate(app, validBody('made-up-token'))).status).toBe(400);
        }

        const blocked = await activate(app, validBody('made-up-token'));
        expect(blocked.status).toBe(429);
        expect(blocked.body.error.code).toBe('too_many_attempts');
      });
    });
  });
});

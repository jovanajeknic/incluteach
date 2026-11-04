import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { errorHandler, notFoundHandler } from '../http/errors.ts';
import { authenticate, readCookie, requireAuth, requireRole } from './currentUser.ts';
import { hashToken } from './sessions.ts';

describe('readCookie', () => {
  it.each([
    ['session=abc', 'abc'],
    ['theme=dark; session=abc; other=1', 'abc'],
    ['session=abc==', 'abc=='],
    ['  session = abc ', 'abc'],
  ])('finds the value in "%s"', (header, expected) => {
    expect(readCookie(header, 'session')).toBe(expected);
  });

  it.each([undefined, '', 'theme=dark', 'mysession=abc', 'session'])(
    'returns nothing for %j',
    (header) => {
      expect(readCookie(header, 'session')).toBeUndefined();
    },
  );
});

// A stand-in for the database that knows two sessions, looked up by the hash of the cookie value.
const sessionsByTokenHash = new Map([
  [hashToken('teacher-session'), 'teacher'],
  [hashToken('admin-session'), 'admin'],
]);

const fakePool = {
  query: async (_sql: string, params?: unknown[]) => {
    const role = sessionsByTokenHash.get(String(params?.[0]));
    return {
      rows: role
        ? [
            {
              id: 'user-1',
              username: 'ana_ivic',
              full_name: 'Ana Ivić',
              email: null,
              role,
              school_id: 'school-1',
            },
          ]
        : [],
    };
  },
};

// A tiny app with routes protected in different ways.
function protectedApp() {
  const app = express();
  app.use(authenticate(fakePool as never));
  app.get('/anyone-signed-in', requireAuth, (req, res) => {
    res.json({ role: req.user?.role });
  });
  app.get('/teachers-only', requireRole('teacher'), (_req, res) => {
    res.json({ ok: true });
  });
  app.get('/teachers-or-admins', requireRole('teacher', 'admin'), (_req, res) => {
    res.json({ ok: true });
  });
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe('requireAuth and requireRole', () => {
  it('lets a signed-in user through requireAuth', async () => {
    const response = await request(protectedApp())
      .get('/anyone-signed-in')
      .set('Cookie', 'session=teacher-session');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ role: 'teacher' });
  });

  it.each(['/anyone-signed-in', '/teachers-only', '/teachers-or-admins'])(
    'answers 401 on %s without a session',
    async (path) => {
      const response = await request(protectedApp()).get(path);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('unauthenticated');
    },
  );

  it('answers 401 for an unknown session', async () => {
    const response = await request(protectedApp())
      .get('/teachers-only')
      .set('Cookie', 'session=unknown');

    expect(response.status).toBe(401);
  });

  it('lets the right role in', async () => {
    const response = await request(protectedApp())
      .get('/teachers-only')
      .set('Cookie', 'session=teacher-session');

    expect(response.status).toBe(200);
  });

  it('answers 403 for the wrong role', async () => {
    const response = await request(protectedApp())
      .get('/teachers-only')
      .set('Cookie', 'session=admin-session');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('forbidden');
  });

  it('accepts any of several roles', async () => {
    for (const session of ['teacher-session', 'admin-session']) {
      const response = await request(protectedApp())
        .get('/teachers-or-admins')
        .set('Cookie', `session=${session}`);

      expect(response.status).toBe(200);
    }
  });
});

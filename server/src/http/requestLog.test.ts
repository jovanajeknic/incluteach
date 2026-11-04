import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { requestLog } from './requestLog.ts';

function appWithLog(lines: string[]) {
  const app = express();
  app.use(express.json());
  app.use(requestLog((line) => lines.push(line)));
  app.get('/hello', (_req, res) => {
    res.json({ ok: true });
  });
  app.post('/login', (_req, res) => {
    res.status(401).json({ error: 'no' });
  });
  return app;
}

describe('requestLog', () => {
  it('writes the method, path, status and duration of a request', async () => {
    const lines: string[] = [];

    await request(appWithLog(lines)).get('/hello');

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^GET \/hello 200 \d+ms$/);
  });

  it('writes the status of a failed request', async () => {
    const lines: string[] = [];

    await request(appWithLog(lines)).post('/login').send({ password: 'tajna' });

    expect(lines[0]).toMatch(/^POST \/login 401 \d+ms$/);
  });

  it('also logs a path that does not exist', async () => {
    const lines: string[] = [];

    await request(appWithLog(lines)).get('/nothing');

    expect(lines[0]).toMatch(/^GET \/nothing 404 \d+ms$/);
  });

  it('leaves out the query string, the body and the cookies', async () => {
    const lines: string[] = [];

    await request(appWithLog(lines))
      .post('/login?search=Ana%20Ivi%C4%87&token=abc123')
      .set('Cookie', 'session=very-secret')
      .send({ password: 'tajna-lozinka' });

    const written = lines.join('\n');
    expect(written).toMatch(/^POST \/login 401/);
    for (const secret of ['Ana', 'abc123', 'very-secret', 'tajna-lozinka', '?']) {
      expect(written).not.toContain(secret);
    }
  });
});

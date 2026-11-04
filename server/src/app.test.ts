import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApp } from './app.ts';
import { errorHandler, HttpError, notFoundHandler } from './http/errors.ts';

const workingPool = { query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }) };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /health', () => {
  it('reports ok when the database answers', async () => {
    const response = await request(createApp({ pool: workingPool })).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('reports unavailable, without details, when the database fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const pool = { query: vi.fn().mockRejectedValue(new Error('password for user "x" failed')) };

    const response = await request(createApp({ pool })).get('/health');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'unavailable' });
    expect(JSON.stringify(response.body)).not.toContain('password');
  });
});

describe('the app', () => {
  it('does not announce that it runs on Express', async () => {
    const response = await request(createApp({ pool: workingPool })).get('/health');

    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('answers an unknown route with a JSON 404', async () => {
    const response = await request(createApp({ pool: workingPool })).get('/nothing-here');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: 'not_found', message: 'Resource not found.' },
    });
  });

  it('answers malformed JSON with a JSON 400', async () => {
    const response = await request(createApp({ pool: workingPool }))
      .post('/anything')
      .set('Content-Type', 'application/json')
      .send('{ not valid json');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('bad_request');
  });

  it('refuses a request body above the size limit', async () => {
    const response = await request(createApp({ pool: workingPool }))
      .post('/anything')
      .send({ text: 'x'.repeat(200_000) });

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('bad_request');
  });
});

describe('errorHandler', () => {
  function appThatThrows(error: unknown): express.Express {
    const app = express();
    app.get('/boom', () => {
      throw error;
    });
    app.get('/async-boom', async () => {
      throw error;
    });
    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
  }

  it('hides the details of an unexpected error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await request(appThatThrows(new Error('relation "users" does not exist'))).get(
      '/boom',
    );

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('internal_error');
    expect(JSON.stringify(response.body)).not.toContain('users');
  });

  it('also catches errors thrown in async handlers', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await request(appThatThrows(new Error('late failure'))).get('/async-boom');

    expect(response.status).toBe(500);
  });

  it('passes on the status and code of an HttpError', async () => {
    const response = await request(
      appThatThrows(new HttpError(403, 'forbidden', 'You cannot do that.')),
    ).get('/boom');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: { code: 'forbidden', message: 'You cannot do that.' } });
  });
});

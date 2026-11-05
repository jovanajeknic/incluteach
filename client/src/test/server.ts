import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

/**
 * The fake backend of the tests. Each test adds the answers it needs with `server.use(...)`,
 * and a request nobody answered fails the test, so the code never silently talks to a real
 * server. It has two answers from the start, because a menu asks for them on every page: the
 * empty list of waiting requests (teacher) and no stars (student).
 */
export const server = setupServer(
  http.get('*/api/enrollments', () => HttpResponse.json({ enrollments: [], total: 0 })),
  http.get('*/api/stars', () =>
    HttpResponse.json({ stars: [], counts: { automatic: 0, teacher: 0 } }),
  ),
);

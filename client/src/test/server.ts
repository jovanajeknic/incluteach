import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

/**
 * The fake backend of the tests. Each test adds the answers it needs with `server.use(...)`,
 * and a request nobody answered fails the test, so the code never silently talks to a real
 * server. The one answer it has from the start is the empty list of waiting requests, which
 * the teacher's menu asks for on every page.
 */
export const server = setupServer(
  http.get('*/api/enrollments', () => HttpResponse.json({ enrollments: [], total: 0 })),
);

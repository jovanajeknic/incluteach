import { setupServer } from 'msw/node';

/**
 * The fake backend of the tests. It has no handlers of its own: each test adds the answers
 * it needs with `server.use(...)`, and a request nobody answered fails the test, so the
 * code never silently talks to a real server.
 */
export const server = setupServer();

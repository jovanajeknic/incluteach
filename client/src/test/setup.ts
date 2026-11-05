import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './server';

// jsdom has no layout engine, so scrolling (used by React Router's ScrollRestoration) is a no-op.
window.scrollTo = () => {};

// Vitest does not enable globals here, so Testing Library cannot clean up on its own.
afterEach(() => {
  cleanup();
});

// Lazy routes (sign-in, registration) are compiled on first use; under a full parallel test
// run that can take longer than Testing Library's default 1 s wait.
configure({ asyncUtilTimeout: 5000 });

// The tests' fake backend. An unanswered request is an error, not a silent pass-through.
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

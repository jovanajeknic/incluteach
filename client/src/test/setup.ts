import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom has no layout engine, so scrolling (used by React Router's ScrollRestoration) is a no-op.
window.scrollTo = () => {};

// Vitest does not enable globals here, so Testing Library cannot clean up on its own.
afterEach(() => {
  cleanup();
});

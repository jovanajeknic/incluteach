import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest does not enable globals here, so Testing Library cannot clean up on its own.
afterEach(() => {
  cleanup();
});

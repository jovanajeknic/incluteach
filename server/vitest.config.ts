import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/loadEnv.ts'],
    // The database tests share one real database, and usernames are unique across it.
    // Test files running at the same time would wait for each other on the same username
    // (and sometimes deadlock), so the files run one after another.
    fileParallelism: false,
    // Tests that use the real database can be slow when the computer is busy; the default of
    // 5 seconds then fails a test that is working.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});

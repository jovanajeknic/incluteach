import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/loadEnv.ts'],
    // The database tests share one real database, and usernames are unique across it.
    // Test files running at the same time would wait for each other on the same username
    // (and sometimes deadlock), so the files run one after another.
    fileParallelism: false,
  },
});

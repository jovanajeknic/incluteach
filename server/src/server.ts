import './loadEnv.ts';

import { createAiProvider } from './ai/index.ts';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { createPool } from './db/pool.ts';
import { BackgroundJobs } from './lessons/jobs.ts';
import { failInterruptedLessons, startCleanup } from './maintenance/cleanup.ts';

const config = loadConfig();
const pool = createPool(config.databaseUrl);

// Nothing can be working on a lesson yet, so any lesson still marked as "processing" was cut
// short by the last stop of the server.
const interrupted = await failInterruptedLessons(pool, 0);
if (interrupted > 0) {
  console.log(`${interrupted} lessons were interrupted by the last stop and can be tried again.`);
}

const jobs = new BackgroundJobs();
const server = createApp({
  pool,
  secureCookies: config.secureCookies,
  publicUrl: config.publicUrl,
  logRequests: true,
  ai: createAiProvider(config.aiProvider, { apiKey: config.aiApiKey, model: config.aiModel }),
  jobs,
}).listen(config.port, () => {
  console.log(`IncluTeach server listening on http://localhost:${config.port}`);
});

const stopCleanup = startCleanup(pool);

// Finish running requests and close database connections when asked to stop.
function shutdown(): void {
  stopCleanup();
  server.close(() => {
    // Gives the AI work that is still running a little time to finish.
    const waitForJobs = Promise.race([
      jobs.onIdle(),
      new Promise((resolve) => setTimeout(resolve, 10_000)),
    ]);
    void waitForJobs.then(() => pool.end()).then(() => process.exit(0));
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

import './loadEnv.ts';

import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { createPool } from './db/pool.ts';
import { startCleanup } from './maintenance/cleanup.ts';

const config = loadConfig();
const pool = createPool(config.databaseUrl);
const server = createApp({
  pool,
  secureCookies: config.secureCookies,
  publicUrl: config.publicUrl,
  logRequests: true,
}).listen(config.port, () => {
  console.log(`IncluTeach server listening on http://localhost:${config.port}`);
});

const stopCleanup = startCleanup(pool);

// Finish running requests and close database connections when asked to stop.
function shutdown(): void {
  stopCleanup();
  server.close(() => {
    void pool.end().then(() => process.exit(0));
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

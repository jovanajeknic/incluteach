import './loadEnv.ts';

import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { createPool } from './db/pool.ts';

const config = loadConfig();
const pool = createPool(config.databaseUrl);
const server = createApp({ pool, secureCookies: config.secureCookies }).listen(config.port, () => {
  console.log(`IncluTeach server listening on http://localhost:${config.port}`);
});

// Finish running requests and close database connections when asked to stop.
function shutdown(): void {
  server.close(() => {
    void pool.end().then(() => process.exit(0));
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

import '../loadEnv.ts';

import { checkConnection, createPool } from '../db/pool.ts';

const pool = createPool();

try {
  const info = await checkConnection(pool);
  console.log(`Connected to "${info.database}" as "${info.user}".`);
  console.log(info.version);
} catch (error) {
  console.error('Database connection failed:', (error as Error).message);
  process.exitCode = 1;
} finally {
  await pool.end();
}

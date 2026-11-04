import pg from 'pg';

import { loadConfig } from '../config.ts';

export function createPool(databaseUrl: string = loadConfig().databaseUrl): pg.Pool {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 10,
    // Fail fast with a clear error when the database is unreachable instead of hanging.
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });

  // Without a listener, an error on an idle connection (for example the database
  // restarting) would crash the whole process.
  pool.on('error', (error) => {
    console.error('Unexpected error on an idle database connection:', error.message);
  });

  return pool;
}

export interface DatabaseInfo {
  database: string;
  user: string;
  version: string;
}

export async function checkConnection(pool: pg.Pool): Promise<DatabaseInfo> {
  const { rows } = await pool.query<DatabaseInfo>(
    'SELECT current_database() AS database, current_user AS "user", version() AS version',
  );
  return rows[0];
}

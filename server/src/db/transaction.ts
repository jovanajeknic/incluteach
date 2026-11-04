import { randomUUID } from 'node:crypto';

import pg from 'pg';

import type { Queryable } from './pool.ts';

// Runs several queries so that either all of them take effect or none does.
//
// With a pool it opens a transaction on its own connection. With a single connection that is
// already inside a transaction (which is how tests keep the database clean) it uses a
// savepoint, which behaves the same way for the code inside.
export async function inTransaction<T>(
  db: Queryable,
  run: (db: Queryable) => Promise<T>,
): Promise<T> {
  if (db instanceof pg.Pool) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const result = await run(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  const savepoint = `savepoint_${randomUUID().replaceAll('-', '')}`;
  await db.query(`SAVEPOINT ${savepoint}`);
  try {
    const result = await run(db);
    await db.query(`RELEASE SAVEPOINT ${savepoint}`);
    return result;
  } catch (error) {
    await db.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    throw error;
  }
}

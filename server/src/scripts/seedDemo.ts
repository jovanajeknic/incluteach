import '../loadEnv.ts';

import { randomBytes } from 'node:crypto';
import { parseArgs } from 'node:util';

import { loadConfig } from '../config.ts';
import { demoExists, DEMO_SCHOOL_NAME, removeDemo, seedDemo } from '../demo/seedDemo.ts';
import { createPool } from '../db/pool.ts';

const USAGE = `Creates a demo school with invented people and lessons, for building and trying the frontend.

Usage: npm run seed:demo [-- --reset | --remove]

  (no option)  create the demo school; stops if it already exists
  --reset      delete the demo school and create it again
  --remove     only delete the demo school

Every demo account gets the same password. It is chosen at random and shown once at the end
(set DEMO_PASSWORD to use your own). The data is invented; do not use this on a real server.`;

const { values } = parseArgs({
  options: { reset: { type: 'boolean' }, remove: { type: 'boolean' }, help: { type: 'boolean' } },
  strict: false,
});

if (values.help) {
  console.log(USAGE);
  process.exit(0);
}
if (process.env.NODE_ENV === 'production') {
  console.error('The demo school is for development only, and NODE_ENV is "production".');
  process.exit(1);
}

const config = loadConfig();
const pool = createPool(config.databaseUrl);
const client = await pool.connect();

try {
  await client.query('BEGIN');

  if (values.remove || values.reset) {
    const removed = await removeDemo(client);
    console.log(removed ? 'The demo school was deleted.' : 'There was no demo school.');
  } else if (await demoExists(client)) {
    throw new Error(
      `The demo school "${DEMO_SCHOOL_NAME}" already exists. Use --reset to create it again.`,
    );
  }

  if (!values.remove) {
    const password = process.env.DEMO_PASSWORD?.trim() || randomBytes(9).toString('base64url');
    const seed = await seedDemo(client, { password });
    await client.query('COMMIT');

    console.log(`Created "${DEMO_SCHOOL_NAME}".\n`);
    for (const account of seed.accounts) {
      console.log(`  ${account.role.padEnd(8)} ${account.username.padEnd(22)} ${account.note}`);
    }
    console.log(`\nPassword of every account: ${seed.password}`);
    console.log('(Shown only now. Run with --reset to get new accounts and a new password.)');
  } else {
    await client.query('COMMIT');
  }
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Could not do it:', (error as Error).message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}

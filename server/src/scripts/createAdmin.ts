import '../loadEnv.ts';

import { parseArgs } from 'node:util';

import { createSchoolWithAdmin } from '../admin/createSchoolWithAdmin.ts';
import { activationUrl } from '../auth/activation.ts';
import { loadConfig } from '../config.ts';
import { createPool } from '../db/pool.ts';

const USAGE = `Creates a school and its first admin.

Usage: npm run create-admin -- --school "School name" --name "Admin Full Name"

The admin gets a one-time link (valid for 7 days) to choose a password and add an email.`;

const { values } = parseArgs({
  options: { school: { type: 'string' }, name: { type: 'string' } },
  strict: false,
});

const schoolName = typeof values.school === 'string' ? values.school.trim() : '';
const adminName = typeof values.name === 'string' ? values.name.trim().replace(/\s+/g, ' ') : '';

if (!schoolName || adminName.length < 2) {
  console.error(USAGE);
  process.exit(1);
}

const config = loadConfig();
const pool = createPool(config.databaseUrl);
const client = await pool.connect();

try {
  await client.query('BEGIN');
  const result = await createSchoolWithAdmin(client, { schoolName, adminName });
  await client.query('COMMIT');

  console.log(`School "${result.school.name}" created.`);
  console.log(`Admin: ${result.admin.fullName} (username: ${result.admin.username})`);
  console.log(
    `Open this link before ${result.activation.expiresAt.toISOString()} to set a password:`,
  );
  console.log(activationUrl(config.publicUrl, result.activation.token));
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Could not create the school:', (error as Error).message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}

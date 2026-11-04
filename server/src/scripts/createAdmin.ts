import '../loadEnv.ts';

import { parseArgs } from 'node:util';

import { createSchoolWithAdmin } from '../admin/createSchoolWithAdmin.ts';
import { activationUrl } from '../auth/activation.ts';
import { loadConfig } from '../config.ts';
import { createPool } from '../db/pool.ts';

const USAGE = `Creates an admin for a school.

Usage: npm run create-admin -- --school "School name" --name "Admin Full Name" [--new-school]

If a school with this name already exists, the admin joins it. Add --new-school to create
a separate school with the same name instead (for example, a school in another town).

The admin gets a one-time link (valid for 7 days) to choose a password and add an email.`;

const { values } = parseArgs({
  options: {
    school: { type: 'string' },
    name: { type: 'string' },
    'new-school': { type: 'boolean' },
  },
  strict: false,
});

const schoolName =
  typeof values.school === 'string' ? values.school.trim().replace(/\s+/g, ' ') : '';
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
  const result = await createSchoolWithAdmin(client, {
    schoolName,
    adminName,
    forceNewSchool: values['new-school'] === true,
  });
  await client.query('COMMIT');

  console.log(
    result.schoolCreated
      ? `School "${result.school.name}" created.`
      : `School "${result.school.name}" already exists: the admin was added to it.`,
  );
  console.log(`Admin: ${result.admin.fullName} (username: ${result.admin.username})`);
  console.log(
    `Open this link before ${result.activation.expiresAt.toISOString()} to set a password:`,
  );
  console.log(activationUrl(config.publicUrl, result.activation.token));
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Could not create the admin:', (error as Error).message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}

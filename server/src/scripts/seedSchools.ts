import '../loadEnv.ts';

import { parseArgs } from 'node:util';

import { loadConfig } from '../config.ts';
import { createPool } from '../db/pool.ts';
import { seedSchools, wipeAllData } from '../demo/seedSchools.ts';

const USAGE = `Fills the development database with four schools, for trying and presenting the whole
application. Each school has an admin (admin_dragisa, admin_stampar, admin_gorki, admin_nazor).
The first one, OŠ Dragiša Ivanović, also has teachers, odeljenja, students, parents, lessons,
requests to join subjects, finished lessons, quiz tries, stars and conversations.

Usage: npm run seed:schools -- --yes

This DELETES EVERYTHING in the database first (all schools, people, lessons and progress;
the tables stay), then creates the schools again. That is why --yes is required.
Every account gets the same password: "password", or the one in SEED_PASSWORD.
The school names are real, the people are invented. Do not use this on a real server.`;

const { values } = parseArgs({
  options: { yes: { type: 'boolean' }, help: { type: 'boolean' } },
  strict: false,
});

if (values.help || !values.yes) {
  console.log(USAGE);
  process.exit(values.help ? 0 : 1);
}
if (process.env.NODE_ENV === 'production') {
  console.error('This is for development only, and NODE_ENV is "production".');
  process.exit(1);
}

const config = loadConfig();
const pool = createPool(config.databaseUrl);
const client = await pool.connect();

try {
  await client.query('BEGIN');
  await wipeAllData(client);
  const seed = await seedSchools(client, {
    password: process.env.SEED_PASSWORD?.trim() || 'password',
  });
  await client.query('COMMIT');

  console.log('Admins:');
  for (const school of seed.schools) {
    console.log(`  ${school.admin.username.padEnd(16)} ${school.name}`);
  }

  console.log('\nTeachers of the first school:');
  for (const teacher of Object.values(seed.main.teachers)) {
    console.log(`  ${teacher.username.padEnd(24)} ${teacher.fullName}`);
  }

  console.log('\nStudents and their parents:');
  for (const schoolClass of seed.main.classes) {
    console.log(`  odeljenje ${schoolClass.name}`);
    for (const { user, parents } of schoolClass.students) {
      const names = parents.map((parent) => parent.username).join(', ');
      console.log(`    ${user.username.padEnd(24)} parents: ${names}`);
    }
  }

  const { rows } = await client.query<{ what: string; n: number }>(
    `SELECT 'enrollments (' || status || ')' AS what, count(*)::int AS n FROM enrollments GROUP BY status
     UNION ALL SELECT 'lessons published', count(*)::int FROM lessons WHERE status = 'published'
     UNION ALL SELECT 'lessons draft', count(*)::int FROM lessons WHERE status <> 'published'
     UNION ALL SELECT 'finished lessons', count(*)::int FROM lesson_completions
     UNION ALL SELECT 'quiz tries', count(*)::int FROM quiz_attempts
     UNION ALL SELECT 'stars (' || source || ')', count(*)::int FROM stars GROUP BY source
     UNION ALL SELECT 'messages', count(*)::int FROM conversation_messages
     ORDER BY 1`,
  );
  console.log('\nWhat was made:');
  for (const row of rows) {
    console.log(`  ${row.what.padEnd(28)} ${row.n}`);
  }
  console.log(`\nPassword of every account: ${seed.password}`);
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Could not do it, nothing was changed:', (error as Error).message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}

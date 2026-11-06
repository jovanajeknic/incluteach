import '../loadEnv.ts';

import { parseArgs } from 'node:util';

import { loadConfig } from '../config.ts';
import { createPool } from '../db/pool.ts';
import { seedPodgorica, wipeAllData } from '../demo/seedPodgorica.ts';

const USAGE = `Fills the development database with six primary schools of Podgorica, for trying the
whole application: an admin, teachers, odeljenja, subjects, students and parents in each.

Usage: npm run seed:podgorica -- --yes

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
  const seed = await seedPodgorica(client, {
    password: process.env.SEED_PASSWORD?.trim() || 'password',
  });
  await client.query('COMMIT');

  for (const school of seed.schools) {
    console.log(`\n${school.name}`);
    console.log(`  admin    ${school.admin.username}`);
    for (const teacher of school.teachers) {
      const subjects = school.classes[0].subjects
        .filter((subject) => subject.teacher.username === teacher.username)
        .map((subject) => subject.name);
      console.log(`  teacher  ${teacher.username.padEnd(24)} ${subjects.join(', ')}`);
    }
    for (const schoolClass of school.classes) {
      console.log(`  odeljenje ${schoolClass.name}`);
      for (const student of schoolClass.students) {
        const parents = student.parents.map((parent) => parent.username).join(', ');
        console.log(`    student ${student.username.padEnd(24)} parents: ${parents}`);
      }
    }
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

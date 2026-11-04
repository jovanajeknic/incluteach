import '../loadEnv.ts';

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';

import { loadConfig } from '../config.ts';
import { createPool } from '../db/pool.ts';
import {
  backupFileName,
  buildDumpCommand,
  chooseDump,
  parseMajorVersion,
  type DumpCandidate,
} from '../maintenance/pgDump.ts';

// server/backups, whether this runs from src/scripts or from dist/scripts.
const BACKUP_FOLDER = path.resolve(import.meta.dirname, '../../backups');

// Where pg_dump might be, best choice first: the path from .env, then the one on PATH, then
// the PostgreSQL folders on Windows (newest version first).
function candidatePaths(): string[] {
  const paths = [process.env.PG_DUMP_PATH, 'pg_dump'].filter((value): value is string =>
    Boolean(value),
  );

  if (process.platform === 'win32') {
    const root = path.join(process.env.ProgramFiles ?? 'C:\\Program Files', 'PostgreSQL');
    if (existsSync(root)) {
      const versions = readdirSync(root)
        .filter((name) => /^\d+$/.test(name))
        .sort((a, b) => Number(b) - Number(a));
      paths.push(...versions.map((version) => path.join(root, version, 'bin', 'pg_dump.exe')));
    }
  }
  return paths;
}

function probe(program: string): DumpCandidate {
  const result = spawnSync(program, ['--version'], { encoding: 'utf8' });
  return {
    path: program,
    major: result.status === 0 ? parseMajorVersion(result.stdout) : null,
  };
}

async function serverMajorVersion(databaseUrl: string): Promise<number> {
  const pool = createPool(databaseUrl);
  try {
    // For example 180006 for PostgreSQL 18.6.
    const { rows } = await pool.query<{ version: number }>(
      `SELECT current_setting('server_version_num')::int AS version`,
    );
    return Math.floor(rows[0].version / 10000);
  } finally {
    await pool.end();
  }
}

try {
  const { databaseUrl } = loadConfig();
  const serverMajor = await serverMajorVersion(databaseUrl);
  const pgDump = chooseDump(candidatePaths().map(probe), serverMajor);

  mkdirSync(BACKUP_FOLDER, { recursive: true });
  const file = path.join(BACKUP_FOLDER, backupFileName());
  const command = buildDumpCommand(databaseUrl, file);

  const code = await new Promise<number | null>((resolve, reject) => {
    const child = spawn(pgDump.path, command.args, {
      env: { ...process.env, ...command.env },
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    child.on('error', reject);
    child.on('close', resolve);
  });

  if (code !== 0) {
    // Do not leave a half-written file that looks like a backup.
    rmSync(file, { force: true });
    throw new Error(`pg_dump failed with exit code ${code}.`);
  }

  console.log(`Backup saved: ${file} (${Math.ceil(statSync(file).size / 1024)} KB)`);
  console.log('Keep a copy somewhere other than this computer. See server/README.md to restore.');
} catch (error) {
  console.error('Backup failed:', (error as Error).message);
  process.exitCode = 1;
}

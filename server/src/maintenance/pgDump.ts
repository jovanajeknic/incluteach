// Helpers for backing up the database with PostgreSQL's own pg_dump tool.

export interface DumpCommand {
  args: string[];
  // The password goes in an environment variable, not in the arguments, because the
  // arguments of a running program can be seen by other programs on the computer.
  env: Record<string, string>;
}

// Splits DATABASE_URL into the options pg_dump understands.
export function buildDumpCommand(databaseUrl: string, file: string): DumpCommand {
  const url = new URL(databaseUrl);

  return {
    args: [
      // Compressed, and restorable with pg_restore, also table by table.
      '--format=custom',
      // The copy does not remember who owned things, so it can be restored under any user.
      '--no-owner',
      `--file=${file}`,
      `--host=${url.hostname}`,
      `--port=${url.port || '5432'}`,
      `--username=${decodeURIComponent(url.username)}`,
      `--dbname=${decodeURIComponent(url.pathname.slice(1))}`,
    ],
    env: { PGPASSWORD: decodeURIComponent(url.password) },
  };
}

// For example incluteach-20261104-213045.dump (the computer's local time).
export function backupFileName(now: Date = new Date()): string {
  const two = (value: number) => String(value).padStart(2, '0');
  const date = `${now.getFullYear()}${two(now.getMonth() + 1)}${two(now.getDate())}`;
  const time = `${two(now.getHours())}${two(now.getMinutes())}${two(now.getSeconds())}`;
  return `incluteach-${date}-${time}.dump`;
}

// "pg_dump (PostgreSQL) 18.6" gives 18.
export function parseMajorVersion(versionOutput: string): number | null {
  const match = /(\d+)(?:\.\d+)*/.exec(versionOutput.replace(/^.*?\)\s*/, ''));
  return match ? Number(match[1]) : null;
}

export interface DumpCandidate {
  path: string;
  // Null when the program could not be run.
  major: number | null;
}

// pg_dump must be the same version as the server or newer; an older one refuses to work.
// Takes the first candidate that qualifies, so the list should be in order of preference.
export function chooseDump(candidates: DumpCandidate[], serverMajor: number): DumpCandidate {
  const usable = candidates.filter((candidate) => candidate.major !== null);
  const chosen = usable.find((candidate) => (candidate.major as number) >= serverMajor);

  if (chosen) {
    return chosen;
  }
  if (usable.length === 0) {
    throw new Error(
      'pg_dump was not found. Install PostgreSQL client tools, or set PG_DUMP_PATH in .env to the full path of pg_dump.',
    );
  }
  const versions = usable.map((candidate) => candidate.major).join(', ');
  throw new Error(
    `The database server is version ${serverMajor}, but the pg_dump programs found are older (${versions}). ` +
      'Set PG_DUMP_PATH in .env to a pg_dump of the same version as the server or newer.',
  );
}

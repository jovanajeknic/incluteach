import { describe, expect, it } from 'vitest';

import { backupFileName, buildDumpCommand, chooseDump, parseMajorVersion } from './pgDump.ts';

describe('buildDumpCommand', () => {
  const url = 'postgresql://incluteach_app:tajna123@localhost:5432/incluteach';

  it('splits the address into pg_dump options', () => {
    const { args } = buildDumpCommand(url, '/backups/x.dump');

    expect(args).toEqual([
      '--format=custom',
      '--no-owner',
      '--file=/backups/x.dump',
      '--host=localhost',
      '--port=5432',
      '--username=incluteach_app',
      '--dbname=incluteach',
    ]);
  });

  it('passes the password in the environment, never in the arguments', () => {
    const { args, env } = buildDumpCommand(url, '/backups/x.dump');

    expect(env).toEqual({ PGPASSWORD: 'tajna123' });
    expect(args.join(' ')).not.toContain('tajna123');
  });

  it('uses the default port when the address has none', () => {
    const { args } = buildDumpCommand('postgresql://u:p@db.example.com/mydb', 'x.dump');

    expect(args).toContain('--port=5432');
    expect(args).toContain('--host=db.example.com');
  });

  it('understands special characters written as %XX in the user and password', () => {
    const { args, env } = buildDumpCommand(
      'postgresql://ana%40school:p%40ss%3Aword@localhost/db',
      'x',
    );

    expect(args).toContain('--username=ana@school');
    expect(env.PGPASSWORD).toBe('p@ss:word');
  });
});

describe('backupFileName', () => {
  it('has the date and the time in it', () => {
    expect(backupFileName(new Date(2026, 10, 4, 9, 5, 7))).toBe('incluteach-20261104-090507.dump');
  });

  it('is different for different moments, so a backup never overwrites another', () => {
    const first = backupFileName(new Date(2026, 10, 4, 9, 5, 7));
    const second = backupFileName(new Date(2026, 10, 4, 9, 5, 8));

    expect(first).not.toBe(second);
  });
});

describe('parseMajorVersion', () => {
  it.each([
    ['pg_dump (PostgreSQL) 18.6', 18],
    ['pg_dump (PostgreSQL) 17.2 (Debian 17.2-1)', 17],
    ['pg_dump (PostgreSQL) 16.0', 16],
    ['pg_dump (PostgreSQL) 9.6.24', 9],
  ])('reads the version from "%s"', (output, expected) => {
    expect(parseMajorVersion(output)).toBe(expected);
  });

  it('gives nothing for text without a version', () => {
    expect(parseMajorVersion('command not found')).toBeNull();
  });
});

describe('chooseDump', () => {
  const candidate = (path: string, major: number | null) => ({ path, major });

  it('takes the first one that is new enough, in the order given', () => {
    const chosen = chooseDump([candidate('a', 17), candidate('b', 18), candidate('c', 19)], 18);

    expect(chosen.path).toBe('b');
  });

  it('accepts a newer pg_dump than the server', () => {
    expect(chooseDump([candidate('new', 19)], 18).path).toBe('new');
  });

  it('skips programs that could not be run', () => {
    expect(chooseDump([candidate('broken', null), candidate('ok', 18)], 18).path).toBe('ok');
  });

  it('refuses an older pg_dump and says which versions it found', () => {
    expect(() => chooseDump([candidate('a', 16), candidate('b', 17)], 18)).toThrow(
      /server is version 18.*older \(16, 17\)/,
    );
  });

  it('explains what to do when there is no pg_dump at all', () => {
    expect(() => chooseDump([candidate('a', null)], 18)).toThrow(/PG_DUMP_PATH/);
    expect(() => chooseDump([], 18)).toThrow(/pg_dump was not found/);
  });
});

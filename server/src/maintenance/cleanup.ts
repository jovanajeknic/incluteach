import type { Queryable } from '../db/pool.ts';

// Activation links are kept this long after they expired, and then removed. They hold only
// hashes, no personal data, but there is no reason to keep them forever.
const KEEP_ACTIVATION_LINKS_DAYS = 30;
const ONE_HOUR_MS = 60 * 60 * 1000;

export interface CleanupResult {
  sessions: number;
  activationLinks: number;
}

// Removes sessions that have ended and old activation links, so the tables do not grow
// without limit. Neither is needed for anything: an ended session no longer works anyway.
export async function deleteExpired(pool: Queryable): Promise<CleanupResult> {
  const sessions = await pool.query('DELETE FROM sessions WHERE expires_at <= now()');
  const links = await pool.query(
    `DELETE FROM activation_tokens
     WHERE expires_at < now() - make_interval(days => $1)`,
    [KEEP_ACTIVATION_LINKS_DAYS],
  );
  return { sessions: sessions.rowCount ?? 0, activationLinks: links.rowCount ?? 0 };
}

// Runs the cleanup once now and then every hour while the server is running. A failure is
// only logged, because the cleanup is housekeeping and must never bring the server down.
// Returns a function that stops it.
export function startCleanup(
  pool: Queryable,
  { intervalMs = ONE_HOUR_MS }: { intervalMs?: number } = {},
): () => void {
  const run = async () => {
    try {
      const result = await deleteExpired(pool);
      if (result.sessions > 0 || result.activationLinks > 0) {
        console.log(
          `Cleanup removed ${result.sessions} ended sessions and ${result.activationLinks} old activation links.`,
        );
      }
    } catch (error) {
      console.error('Cleanup failed:', (error as Error).message);
    }
  };

  void run();
  const timer = setInterval(() => void run(), intervalMs);
  // The timer alone must not keep the process alive when the server is shutting down.
  timer.unref();
  return () => clearInterval(timer);
}

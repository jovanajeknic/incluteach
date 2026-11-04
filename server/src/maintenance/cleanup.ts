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

// A lesson stays "processing" while the AI works on it. If the server stops in the middle (a
// crash, a restart), nothing would ever finish it, so it is put back to a draft with a message.
// `olderThanMinutes` 0 means every lesson in that state, which is right when the server has
// just started and so nothing can be working on one.
export async function failInterruptedLessons(
  pool: Queryable,
  olderThanMinutes = 10,
): Promise<number> {
  const result = await pool.query(
    `UPDATE lessons SET status = 'draft', updated_at = now(),
       processing_error = 'The work was interrupted. Try again.'
     WHERE status = 'processing' AND updated_at <= now() - make_interval(mins => $1)`,
    [olderThanMinutes],
  );
  return result.rowCount ?? 0;
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
      const interrupted = await failInterruptedLessons(pool);
      if (interrupted > 0) {
        console.log(`Cleanup ended the processing of ${interrupted} lessons that was stuck.`);
      }
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

// Runs work in the background, after the answer to a request has been sent (for example the AI
// making a summary, which takes a while). It remembers what is still running, so the server
// can wait for it before it stops and tests can wait for it to finish.
export class BackgroundJobs {
  private readonly running = new Set<Promise<void>>();

  // Starts the job and returns at once. A job that fails must handle its own failure; if it
  // does not, the failure is only logged, because nobody is waiting for the answer.
  run(job: () => Promise<void>): void {
    const promise: Promise<void> = job()
      .catch((error: unknown) => {
        console.error('Background job failed:', error);
      })
      .finally(() => {
        this.running.delete(promise);
      });
    this.running.add(promise);
  }

  // Resolves when nothing is running, also for jobs started while waiting.
  async onIdle(): Promise<void> {
    while (this.running.size > 0) {
      await Promise.allSettled([...this.running]);
    }
  }
}

import { afterEach, describe, expect, it, vi } from 'vitest';

import { BackgroundJobs } from './jobs.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BackgroundJobs', () => {
  it('starts a job and returns at once, and onIdle waits for it', async () => {
    const jobs = new BackgroundJobs();
    let finished = false;

    jobs.run(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      finished = true;
    });
    expect(finished).toBe(false);
    await jobs.onIdle();

    expect(finished).toBe(true);
  });

  it('waits for all the jobs, also the ones started while waiting', async () => {
    const jobs = new BackgroundJobs();
    const order: string[] = [];

    jobs.run(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      order.push('first');
      jobs.run(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        order.push('second');
      });
    });
    await jobs.onIdle();

    expect(order).toEqual(['first', 'second']);
  });

  it('only logs a job that fails, and goes on', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const jobs = new BackgroundJobs();
    let other = false;

    jobs.run(async () => {
      throw new Error('broken');
    });
    jobs.run(async () => {
      other = true;
    });
    await jobs.onIdle();

    expect(error).toHaveBeenCalledWith('Background job failed:', expect.any(Error));
    expect(other).toBe(true);
  });

  it('is idle at once when nothing was started', async () => {
    await expect(new BackgroundJobs().onIdle()).resolves.toBeUndefined();
  });
});

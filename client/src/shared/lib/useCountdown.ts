import { useEffect, useState } from 'react';

/** Whole seconds left until `until` (an ISO time), counting down once a second; 0 when it came. */
export function useSecondsLeft(until: string | null | undefined): number {
  const target = until ? new Date(until).getTime() : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (target === null) return;
    // Right away (not in this very render), so a time that was set a while after the page
    // opened is not measured from the moment the page opened.
    const first = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [target]);

  return target === null ? 0 : Math.max(0, Math.ceil((target - now) / 1000));
}

/** 65 seconds as "1:05". */
export function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

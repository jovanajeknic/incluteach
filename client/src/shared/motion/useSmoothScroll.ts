import Lenis from 'lenis';
import { useEffect } from 'react';

/**
 * Softer, eased page scrolling while the calling layout is mounted. In-page links glide to
 * their section too; `anchorOffset` keeps the target clear of a sticky header. Skipped when
 * the user asks the system for less motion, and where matchMedia is missing (tests), so the
 * browser's own scrolling stays in place there.
 */
export function useSmoothScroll({ anchorOffset = 0 }: { anchorOffset?: number } = {}) {
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.12,
      anchors: { offset: -anchorOffset },
    });
    return () => lenis.destroy();
  }, [anchorOffset]);
}

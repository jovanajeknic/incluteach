import { useLayoutEffect } from 'react';

const ROOT_CLASS = 'js-reveal';

/**
 * Elements marked with `data-reveal` slide in once when they scroll into view.
 * Runs only when motion is allowed and IntersectionObserver exists; otherwise the
 * root class is never added and every element simply stays visible.
 */
export function useScrollReveal() {
  // Layout effect: the hidden start state must apply before the first paint, or content would flash.
  useLayoutEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const root = document.documentElement;
    root.classList.add(ROOT_CLASS);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.15 },
    );
    document.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
      root.classList.remove(ROOT_CLASS);
    };
  }, []);
}

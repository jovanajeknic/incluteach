/**
 * The intro plays on every visit to the landing page, except when the user asks for
 * reduced motion or the browser cannot run the Web Animations API.
 */
export function shouldPlayLogoIntro(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof Element.prototype.animate !== 'function') return false;
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Transform that moves and scales `from` so it lands exactly on `to` (the FLIP technique). */
export function transformBetween(from: DOMRect, to: DOMRect): string {
  const scale = to.width / from.width;
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  return `translate(${dx}px, ${dy}px) scale(${scale})`;
}

import { useEffect, useRef, type RefObject } from 'react';
import { LogoMark } from '@/shared/brand/Logo';
import { transformBetween } from '../logoIntro';

const APPEAR_MS = 450;
const HOLD_MS = 350;
const MOVE_MS = 750;
const FADE_MS = 450;
const EASE_IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)';

interface LogoIntroProps {
  /** The header logo the large logo flies to. */
  targetRef: RefObject<SVGSVGElement | null>;
  onFinish: () => void;
}

/**
 * Shows the logo large, then shrinks it into its place in the header while the cream
 * backdrop fades away. Purely visual: hidden from assistive technology, the page is already
 * rendered underneath, and any click or key press skips it.
 */
export function LogoIntro({ targetRef, onFinish }: LogoIntroProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<SVGSVGElement>(null);
  const finishRef = useRef<() => void>(() => {});

  useEffect(() => {
    const backdrop = backdropRef.current;
    const logo = logoRef.current;
    if (!backdrop || !logo) return;

    let done = false;
    const animations: Animation[] = [];
    const finish = () => {
      if (done) return;
      done = true;
      animations.forEach((animation) => animation.cancel());
      onFinish();
    };
    finishRef.current = finish;

    async function play(backdrop: HTMLDivElement, logo: SVGSVGElement) {
      const appear = logo.animate(
        [
          { opacity: 0, transform: 'scale(0.92)' },
          { opacity: 1, transform: 'scale(1)' },
        ],
        { duration: APPEAR_MS, easing: 'ease-out', fill: 'forwards' },
      );
      animations.push(appear);
      await appear.finished;

      // Measured only now, after the header has laid out and the logo is at full size.
      const target = targetRef.current?.getBoundingClientRect();
      const moveKeyframes =
        target && target.width > 0
          ? [
              { transform: 'none' },
              { transform: transformBetween(logo.getBoundingClientRect(), target) },
            ]
          : [{ opacity: 1 }, { opacity: 0 }];
      const move = logo.animate(moveKeyframes, {
        duration: MOVE_MS,
        delay: HOLD_MS,
        easing: EASE_IN_OUT,
        fill: 'forwards',
      });
      // The page starts to show while the logo is still on its way.
      const fade = backdrop.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: FADE_MS,
        delay: HOLD_MS + MOVE_MS - FADE_MS,
        easing: 'ease-out',
        fill: 'forwards',
      });
      animations.push(move, fade);
      await Promise.all([move.finished, fade.finished]);
      finish();
    }

    // A rejected `finished` promise means the animation was cancelled by a skip or unmount.
    play(backdrop, logo).catch(() => finish());

    window.addEventListener('keydown', finish);
    return () => {
      window.removeEventListener('keydown', finish);
      done = true;
      animations.forEach((animation) => animation.cancel());
    };
  }, [onFinish, targetRef]);

  return (
    <div
      aria-hidden="true"
      data-logo-intro=""
      className="fixed inset-0 z-[60] cursor-pointer"
      onClick={() => finishRef.current()}
    >
      <div ref={backdropRef} className="absolute inset-0 bg-mint" />
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <LogoMark
          ref={logoRef}
          className="h-auto w-[min(70vw,26rem)] opacity-0"
          style={{ transformOrigin: 'center' }}
        />
      </div>
    </div>
  );
}

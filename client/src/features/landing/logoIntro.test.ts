import { describe, expect, it } from 'vitest';
import { transformBetween } from './logoIntro';

const rect = (left: number, top: number, width: number, height: number) =>
  ({ left, top, width, height }) as DOMRect;

describe('transformBetween', () => {
  it('moves the centre of one box onto another and scales to its width', () => {
    // Large logo centred at (500, 400), 400 wide; header logo centred at (40, 36), 40 wide.
    const from = rect(300, 240, 400, 320);
    const to = rect(20, 20, 40, 32);
    expect(transformBetween(from, to)).toBe('translate(-460px, -364px) scale(0.1)');
  });

  it('is a no-op for identical boxes', () => {
    const box = rect(10, 10, 100, 80);
    expect(transformBetween(box, box)).toBe('translate(0px, 0px) scale(1)');
  });
});

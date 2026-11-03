import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/renderApp';

// jsdom implements neither the Web Animations API nor matchMedia, so both are stubbed here.
type AnimateMock = ReturnType<typeof vi.fn>;

function stubAnimations({ finishImmediately }: { finishImmediately: boolean }): AnimateMock {
  const animate = vi.fn(() => ({
    finished: finishImmediately ? Promise.resolve() : new Promise(() => {}),
    cancel: vi.fn(),
  }));
  Object.defineProperty(Element.prototype, 'animate', { value: animate, configurable: true });
  return animate;
}

function stubReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

const getIntro = () => document.querySelector('[data-logo-intro]');
const getHeaderMark = () => screen.getByRole('banner').querySelector('svg');

describe('Logo intro', () => {
  beforeEach(() => stubReducedMotion(false));

  afterEach(() => {
    delete (Element.prototype as Partial<Element>).animate;
    // @ts-expect-error -- removing the test stub restores jsdom's original state.
    delete window.matchMedia;
  });

  it('covers the landing page and keeps it available to assistive technology', () => {
    stubAnimations({ finishImmediately: false });
    renderApp({ path: '/' });

    expect(getIntro()).toBeInTheDocument();
    expect(getIntro()).toHaveAttribute('aria-hidden', 'true');
    expect(getHeaderMark()).toHaveClass('opacity-0');
    // The real page is already rendered underneath.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Različiti načini učenja. Jednake prilike.' }),
    ).toBeInTheDocument();
  });

  it('removes itself and reveals the header logo when the animation ends', async () => {
    const animate = stubAnimations({ finishImmediately: true });
    renderApp({ path: '/' });

    await act(async () => {});

    expect(animate).toHaveBeenCalled();
    expect(getIntro()).not.toBeInTheDocument();
    expect(getHeaderMark()).not.toHaveClass('opacity-0');
  });

  it('can be skipped with any key', () => {
    stubAnimations({ finishImmediately: false });
    renderApp({ path: '/' });

    fireEvent.keyDown(window, { key: 'Enter' });

    expect(getIntro()).not.toBeInTheDocument();
    expect(getHeaderMark()).not.toHaveClass('opacity-0');
  });

  it('can be skipped with a click', () => {
    stubAnimations({ finishImmediately: false });
    renderApp({ path: '/' });

    fireEvent.click(getIntro()!);

    expect(getIntro()).not.toBeInTheDocument();
  });

  it('does not play when the user prefers reduced motion', () => {
    stubReducedMotion(true);
    const animate = stubAnimations({ finishImmediately: false });
    renderApp({ path: '/' });

    expect(getIntro()).not.toBeInTheDocument();
    expect(animate).not.toHaveBeenCalled();
  });

  it('does not play in the teacher area', () => {
    stubAnimations({ finishImmediately: false });
    renderApp({ path: '/teacher' });

    expect(getIntro()).not.toBeInTheDocument();
  });
});

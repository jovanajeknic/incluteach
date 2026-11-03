import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useScrollReveal } from './useScrollReveal';

// jsdom has no IntersectionObserver or matchMedia; this stub lets the test trigger visibility.
let observerCallback: IntersectionObserverCallback | undefined;

function stubIntersectionObserver() {
  observerCallback = undefined;
  const observe = vi.fn();
  const unobserve = vi.fn();
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback;
      }
      observe = observe;
      unobserve = unobserve;
      disconnect = vi.fn();
    },
  );
  return { observe };
}

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: reduce && query.includes('reduce') })),
  );
}

function Page() {
  useScrollReveal();
  return <div data-reveal="" data-testid="block" />;
}

describe('useScrollReveal', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.classList.remove('js-reveal');
  });

  it('hides blocks until they scroll into view, then reveals them', () => {
    stubReducedMotion(false);
    const { observe } = stubIntersectionObserver();
    const { getByTestId } = render(<Page />);
    const block = getByTestId('block');

    expect(document.documentElement).toHaveClass('js-reveal');
    expect(observe).toHaveBeenCalledWith(block);
    expect(block).not.toHaveClass('is-revealed');

    act(() => {
      observerCallback?.(
        [{ isIntersecting: true, target: block } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    expect(block).toHaveClass('is-revealed');
  });

  it('leaves everything visible when the user prefers reduced motion', () => {
    stubReducedMotion(true);
    const { observe } = stubIntersectionObserver();
    render(<Page />);

    expect(document.documentElement).not.toHaveClass('js-reveal');
    expect(observe).not.toHaveBeenCalled();
  });

  it('removes its root class when the page unmounts', () => {
    stubReducedMotion(false);
    stubIntersectionObserver();
    const { unmount } = render(<Page />);

    unmount();
    expect(document.documentElement).not.toHaveClass('js-reveal');
  });
});

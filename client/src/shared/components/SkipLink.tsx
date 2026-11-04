import { text } from '@/text/sr-Latn';

export const MAIN_CONTENT_ID = 'main-content';

/** First focusable element on every page; lets keyboard users jump past the navigation. */
export function SkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only z-50 rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      {text.app.skipToContent}
    </a>
  );
}

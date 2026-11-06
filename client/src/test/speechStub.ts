import { vi } from 'vitest';

/**
 * A fake voice of the browser, for tests of reading aloud. Returns the list that fills up with
 * the sentences the voice was asked to speak. By default it speaks the first sentence and
 * waits; with `readAll` it reads to the end. Undo it with `vi.unstubAllGlobals()`.
 */
export function stubVoice(
  options: { readAll?: boolean; voices?: { lang: string; name: string }[] } = {},
): string[] {
  const spoken: string[] = [];
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      text: string;
      voice: unknown = null;
      lang = '';
      rate = 1;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    },
  );
  const synth = {
    getVoices: () => options.voices ?? [{ lang: 'sr-RS', name: 'Test glas' }],
    speak: vi.fn(
      (utterance: { text: string; onstart: (() => void) | null; onend: (() => void) | null }) => {
        spoken.push(utterance.text);
        utterance.onstart?.();
        // A voice that reads on to the end, so the next sentence is spoken too.
        if (options.readAll) utterance.onend?.();
      },
    ),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal('speechSynthesis', synth);
  return spoken;
}

/**
 * How lesson text is displayed. These settings change presentation only, never the lesson
 * content itself (content adaptation is a separate, teacher-approved lesson version).
 */
export interface ReadingPreferences {
  font: 'standard' | 'rounded' | 'dyslexic';
  size: 'm' | 'l' | 'xl';
  lineSpacing: 'normal' | 'relaxed' | 'loose';
  letterSpacing: 'normal' | 'wide';
  background: 'white' | 'cream' | 'mint' | 'sky' | 'butter';
}

export const FONT_OPTIONS = ['standard', 'rounded', 'dyslexic'] as const;
export const SIZE_OPTIONS = ['m', 'l', 'xl'] as const;
export const LINE_SPACING_OPTIONS = ['normal', 'relaxed', 'loose'] as const;
export const LETTER_SPACING_OPTIONS = ['normal', 'wide'] as const;
export const BACKGROUND_OPTIONS = ['white', 'cream', 'mint', 'sky', 'butter'] as const;

export type ReadingPreset = 'standard' | 'easier-reading';

/**
 * Starting point for a student. The "easier reading" preset opens lessons with the
 * dyslexia-friendly font and more space; the student can still change every setting.
 */
export function presetPreferences(preset: ReadingPreset): ReadingPreferences {
  if (preset === 'easier-reading') {
    return {
      font: 'dyslexic',
      size: 'l',
      lineSpacing: 'relaxed',
      letterSpacing: 'wide',
      background: 'cream',
    };
  }
  return {
    font: 'standard',
    size: 'm',
    lineSpacing: 'normal',
    letterSpacing: 'normal',
    background: 'white',
  };
}

const fontClass: Record<ReadingPreferences['font'], string> = {
  standard: 'font-sans',
  rounded: 'font-display',
  dyslexic: 'font-dyslexic',
};
const sizeClass: Record<ReadingPreferences['size'], string> = {
  m: 'text-lg',
  l: 'text-xl',
  xl: 'text-2xl',
};
const lineSpacingClass: Record<ReadingPreferences['lineSpacing'], string> = {
  normal: 'leading-relaxed',
  relaxed: 'leading-loose',
  loose: 'leading-[2.4]',
};
const letterSpacingClass: Record<ReadingPreferences['letterSpacing'], string> = {
  normal: 'tracking-normal',
  wide: 'tracking-[0.05em] [word-spacing:0.15em]',
};
export const backgroundClass: Record<ReadingPreferences['background'], string> = {
  white: 'bg-card',
  cream: 'bg-paper',
  mint: 'bg-mint',
  sky: 'bg-sky',
  butter: 'bg-butter',
};

/** Classes for the lesson text itself. */
export function readingTextClassName(preferences: ReadingPreferences): string {
  return [
    fontClass[preferences.font],
    sizeClass[preferences.size],
    lineSpacingClass[preferences.lineSpacing],
    letterSpacingClass[preferences.letterSpacing],
  ].join(' ');
}

function isOneOf<T extends string>(options: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (options as readonly string[]).includes(value);
}

/** Accepts stored data only if every field is still a valid option; otherwise uses the fallback. */
export function parseStoredPreferences(
  raw: string | null,
  fallback: ReadingPreferences,
): ReadingPreferences {
  if (!raw) return fallback;
  try {
    const value = JSON.parse(raw) as Partial<Record<keyof ReadingPreferences, unknown>>;
    return {
      font: isOneOf(FONT_OPTIONS, value.font) ? value.font : fallback.font,
      size: isOneOf(SIZE_OPTIONS, value.size) ? value.size : fallback.size,
      lineSpacing: isOneOf(LINE_SPACING_OPTIONS, value.lineSpacing)
        ? value.lineSpacing
        : fallback.lineSpacing,
      letterSpacing: isOneOf(LETTER_SPACING_OPTIONS, value.letterSpacing)
        ? value.letterSpacing
        : fallback.letterSpacing,
      background: isOneOf(BACKGROUND_OPTIONS, value.background)
        ? value.background
        : fallback.background,
    };
  } catch {
    return fallback;
  }
}

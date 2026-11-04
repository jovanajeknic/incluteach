import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react';
import { useId } from 'react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import {
  BACKGROUND_OPTIONS,
  backgroundClass,
  FONT_OPTIONS,
  LETTER_SPACING_OPTIONS,
  LINE_SPACING_OPTIONS,
  SIZE_OPTIONS,
  type ReadingPreferences,
} from './readingPreferences';

interface ChoiceGroupProps<T extends string> {
  legend: string;
  options: readonly T[];
  value: T;
  labels: Record<T, string>;
  onChange: (value: T) => void;
  /** Optional per-option extra classes, e.g. a colour swatch or a font preview. */
  optionClassName?: (option: T) => string;
}

/** Native radio buttons styled as chips: arrow keys, labels and announcements work as usual. */
function ChoiceGroup<T extends string>({
  legend,
  options,
  value,
  labels,
  onChange,
  optionClassName,
}: ChoiceGroupProps<T>) {
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-2 font-display font-medium text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-2 text-ink transition-colors hover:border-forest/40 has-[:checked]:border-forest has-[:checked]:bg-mint has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
              optionClassName?.(option),
            )}
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            {labels[option]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface ReadingPreferencesPanelProps {
  id: string;
  preferences: ReadingPreferences;
  onChange: <K extends keyof ReadingPreferences>(field: K, value: ReadingPreferences[K]) => void;
  onReset: () => void;
  className?: string;
}

// Background chips keep their own colour when selected; the forest border marks the choice.
const backgroundSwatchClass: Record<ReadingPreferences['background'], string> = {
  white: `${backgroundClass.white} has-[:checked]:bg-card`,
  cream: `${backgroundClass.cream} has-[:checked]:bg-paper`,
  mint: `${backgroundClass.mint} has-[:checked]:bg-mint`,
  sky: `${backgroundClass.sky} has-[:checked]:bg-sky`,
  butter: `${backgroundClass.butter} has-[:checked]:bg-butter`,
};

const fontPreviewClass: Record<ReadingPreferences['font'], string> = {
  standard: 'font-sans',
  rounded: 'font-display',
  dyslexic: 'font-dyslexic',
};

export function ReadingPreferencesPanel({
  id,
  preferences,
  onChange,
  onReset,
  className,
}: ReadingPreferencesPanelProps) {
  const t = text.student.reading;

  return (
    <section
      id={id}
      aria-label={t.title}
      className={cn('rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6', className)}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <ChoiceGroup
          legend={t.font.label}
          options={FONT_OPTIONS}
          value={preferences.font}
          labels={{ standard: t.font.standard, rounded: t.font.rounded, dyslexic: t.font.dyslexic }}
          onChange={(value) => onChange('font', value)}
          optionClassName={(option) => fontPreviewClass[option]}
        />
        <ChoiceGroup
          legend={t.size.label}
          options={SIZE_OPTIONS}
          value={preferences.size}
          labels={{ m: t.size.m, l: t.size.l, xl: t.size.xl }}
          onChange={(value) => onChange('size', value)}
        />
        <ChoiceGroup
          legend={t.lineSpacing.label}
          options={LINE_SPACING_OPTIONS}
          value={preferences.lineSpacing}
          labels={{
            normal: t.lineSpacing.normal,
            relaxed: t.lineSpacing.relaxed,
            loose: t.lineSpacing.loose,
          }}
          onChange={(value) => onChange('lineSpacing', value)}
        />
        <ChoiceGroup
          legend={t.letterSpacing.label}
          options={LETTER_SPACING_OPTIONS}
          value={preferences.letterSpacing}
          labels={{ normal: t.letterSpacing.normal, wide: t.letterSpacing.wide }}
          onChange={(value) => onChange('letterSpacing', value)}
        />
        <div className="md:col-span-2">
          <ChoiceGroup
            legend={t.background.label}
            options={BACKGROUND_OPTIONS}
            value={preferences.background}
            labels={{
              white: t.background.white,
              cream: t.background.cream,
              mint: t.background.mint,
              sky: t.background.sky,
              butter: t.background.butter,
            }}
            onChange={(value) => onChange('background', value)}
            optionClassName={(option) => backgroundSwatchClass[option]}
          />
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-sm text-ink-soft">{t.savedNote}</p>
        <Button type="button" variant="outline" onClick={onReset} className="h-10 px-4">
          <ArrowCounterClockwiseIcon weight="bold" aria-hidden="true" />
          {t.reset}
        </Button>
      </div>
    </section>
  );
}

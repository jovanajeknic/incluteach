import {
  BookOpenTextIcon,
  GlobeHemisphereWestIcon,
  LeafIcon,
  MathOperationsIcon,
  PaletteIcon,
  type Icon,
} from '@phosphor-icons/react';
import type { SubjectColor, SubjectIcon } from '@/shared/visual/subjectTypes';

/** Teacher-area subject icons (Phosphor, used with the duotone weight). */
export const teacherSubjectIcons: Record<SubjectIcon, Icon> = {
  leaf: LeafIcon,
  calculator: MathOperationsIcon,
  book: BookOpenTextIcon,
  globe: GlobeHemisphereWestIcon,
  palette: PaletteIcon,
};

/**
 * Surface, shape colour and text colour per subject. "-deep" colours are for shapes only;
 * text always uses the "-ink" colour (WCAG AA checked, see docs/DESIGN.md).
 */
export const subjectTheme: Record<SubjectColor, { surface: string; deep: string; ink: string }> = {
  mint: { surface: 'bg-mint', deep: 'bg-mint-deep', ink: 'text-mint-ink' },
  blush: { surface: 'bg-blush', deep: 'bg-blush-deep', ink: 'text-blush-ink' },
  butter: { surface: 'bg-butter', deep: 'bg-butter-deep', ink: 'text-butter-ink' },
  lilac: { surface: 'bg-lilac', deep: 'bg-lilac-deep', ink: 'text-lilac-ink' },
  sky: { surface: 'bg-sky', deep: 'bg-sky-deep', ink: 'text-sky-ink' },
  pistachio: { surface: 'bg-pistachio', deep: 'bg-pistachio-deep', ink: 'text-pistachio-ink' },
};

/** An organic blob outline: soft and hand-shaped, not a pill or a square. */
export const blobShape = 'rounded-[42%_58%_55%_45%/52%_44%_56%_48%]';

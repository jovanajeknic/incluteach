import { BookOpen, Calculator, Globe, Leaf, Palette, type LucideIcon } from 'lucide-react';
import type { SubjectColor, SubjectIcon } from './types';

export const subjectIcons: Record<SubjectIcon, LucideIcon> = {
  leaf: Leaf,
  calculator: Calculator,
  book: BookOpen,
  globe: Globe,
  palette: Palette,
};

/** Pastel surface plus the matching dark "ink" for text and icons (WCAG AA checked). */
export const subjectColorClasses: Record<SubjectColor, { surface: string; ink: string }> = {
  mint: { surface: 'bg-mint', ink: 'text-mint-ink' },
  blush: { surface: 'bg-blush', ink: 'text-blush-ink' },
  butter: { surface: 'bg-butter', ink: 'text-butter-ink' },
  lilac: { surface: 'bg-lilac', ink: 'text-lilac-ink' },
  sky: { surface: 'bg-sky', ink: 'text-sky-ink' },
  pistachio: { surface: 'bg-pistachio', ink: 'text-pistachio-ink' },
};

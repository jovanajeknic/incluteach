import {
  ImageIcon,
  PencilLineIcon,
  ScissorsIcon,
  SpeakerHighIcon,
  StairsIcon,
  TextAaIcon,
  type Icon,
} from '@phosphor-icons/react';
import type { LessonVersionKind } from '@/features/student/types';

/** Icon and colour per version, used on tabs and in the publish summary. */
export const versionAppearance: Record<LessonVersionKind, { icon: Icon; tone: string }> = {
  standard: { icon: PencilLineIcon, tone: 'bg-paper text-ink' },
  shortened: { icon: ScissorsIcon, tone: 'bg-sky text-sky-ink' },
  easier: { icon: StairsIcon, tone: 'bg-pistachio text-pistachio-ink' },
  dyslexia: { icon: TextAaIcon, tone: 'bg-lilac text-lilac-ink' },
  audio: { icon: SpeakerHighIcon, tone: 'bg-blush text-blush-ink' },
  illustrations: { icon: ImageIcon, tone: 'bg-butter text-butter-ink' },
};

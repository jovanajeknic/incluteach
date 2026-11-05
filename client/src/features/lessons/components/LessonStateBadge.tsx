import {
  EyeIcon,
  PaperPlaneTiltIcon,
  PencilSimpleIcon,
  SparkleIcon,
  type Icon,
} from '@phosphor-icons/react';
import { cn } from '@/shared/lib/utils';
import { text } from '@/text/sr-Latn';
import type { LessonState } from '../api/lessonsApi';

// Each state has its own word and icon, so colour is never the only difference.
const appearance: Record<LessonState, { icon: Icon; className: string }> = {
  draft: { icon: PencilSimpleIcon, className: 'text-ink-soft' },
  processing: { icon: SparkleIcon, className: 'text-lilac-ink' },
  in_review: { icon: EyeIcon, className: 'text-butter-ink' },
  published: { icon: PaperPlaneTiltIcon, className: 'text-mint-ink' },
};

/** Icon and word in the state colour; no box around it, so lists stay calm. */
export function LessonStateBadge({ state, className }: { state: LessonState; className?: string }) {
  const { icon: StateIcon, className: tone } = appearance[state];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 font-display text-sm font-medium',
        tone,
        className,
      )}
    >
      <StateIcon aria-hidden="true" weight="duotone" className="size-5" />
      {text.teacher.states[state]}
    </span>
  );
}

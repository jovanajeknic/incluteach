import { CheckCircleIcon, PlayCircleIcon, SparkleIcon, type Icon } from '@phosphor-icons/react';
import { cn } from '@/shared/lib/utils';
import { text } from '@/text/sr-Latn';
import type { LessonProgress } from '../types';

// Text and icon carry the meaning; colour only supports it.
const appearance: Record<LessonProgress, { icon: Icon; className: string }> = {
  new: { icon: SparkleIcon, className: 'text-lilac-ink' },
  started: { icon: PlayCircleIcon, className: 'text-butter-ink' },
  completed: { icon: CheckCircleIcon, className: 'text-mint-ink' },
};

/** Icon and word in the progress colour, without a box around it. */
export function ProgressBadge({ progress }: { progress: LessonProgress }) {
  const { icon: ProgressIcon, className } = appearance[progress];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 font-display text-sm font-medium',
        className,
      )}
    >
      <ProgressIcon aria-hidden="true" weight="duotone" className="size-5" />
      {text.student.subject.status[progress]}
    </span>
  );
}

import {
  CheckCircleIcon,
  EyeIcon,
  PaperPlaneTiltIcon,
  PencilSimpleIcon,
  SparkleIcon,
  type Icon,
} from '@phosphor-icons/react';
import type { LessonStatus } from '@/features/school/types';
import { cn } from '@/shared/lib/utils';
import { text } from '@/text/sr-Latn';

// Each status has its own text and icon, so colour is never the only difference.
const statusAppearance: Record<LessonStatus, { icon: Icon; className: string }> = {
  draft: { icon: PencilSimpleIcon, className: 'text-ink-soft' },
  processing: { icon: SparkleIcon, className: 'text-lilac-ink' },
  in_review: { icon: EyeIcon, className: 'text-butter-ink' },
  approved: { icon: CheckCircleIcon, className: 'text-sky-ink' },
  assigned: { icon: PaperPlaneTiltIcon, className: 'text-mint-ink' },
};

/** Icon and word in the status colour; no box around it, so lists stay calm. */
export function LessonStatusBadge({
  status,
  className,
}: {
  status: LessonStatus;
  className?: string;
}) {
  const { icon: StatusIcon, className: tone } = statusAppearance[status];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 font-display text-sm font-medium',
        tone,
        className,
      )}
    >
      <StatusIcon aria-hidden="true" weight="duotone" className="size-5" />
      {text.lesson.statuses[status]}
    </span>
  );
}

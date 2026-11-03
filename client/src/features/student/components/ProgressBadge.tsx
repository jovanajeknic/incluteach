import { CheckCircle2, CirclePlay, Sparkles, type LucideIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { text } from '@/text/sr-Latn';
import type { LessonProgress } from '../types';

// Text and icon carry the meaning; colour only supports it.
const appearance: Record<LessonProgress, { icon: LucideIcon; className: string }> = {
  new: { icon: Sparkles, className: 'bg-lilac text-lilac-ink' },
  started: { icon: CirclePlay, className: 'bg-butter text-butter-ink' },
  completed: { icon: CheckCircle2, className: 'bg-mint text-mint-ink' },
};

export function ProgressBadge({ progress }: { progress: LessonProgress }) {
  const { icon: Icon, className } = appearance[progress];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 font-display text-sm font-medium',
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
      {text.student.subject.status[progress]}
    </span>
  );
}

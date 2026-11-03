import { CheckCircle2, Eye, PencilLine, Send, Sparkles, type LucideIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/ui/badge';
import { text } from '@/text/sr-Latn';
import type { LessonStatus } from '../types';

// Each status has its own text and icon, so colour is never the only difference.
const statusAppearance: Record<LessonStatus, { icon: LucideIcon; className: string }> = {
  draft: { icon: PencilLine, className: 'border-border bg-paper text-ink' },
  processing: { icon: Sparkles, className: 'border-lilac-deep bg-lilac text-lilac-ink' },
  in_review: { icon: Eye, className: 'border-butter-deep bg-butter text-butter-ink' },
  approved: { icon: CheckCircle2, className: 'border-sky-deep bg-sky text-sky-ink' },
  assigned: { icon: Send, className: 'border-mint-deep bg-mint text-mint-ink' },
};

interface LessonStatusBadgeProps {
  status: LessonStatus;
}

export function LessonStatusBadge({ status }: LessonStatusBadgeProps) {
  const { icon: Icon, className } = statusAppearance[status];

  return (
    <Badge variant="outline" className={cn('gap-1.5 px-2.5 py-1 text-sm', className)}>
      <Icon aria-hidden="true" className="size-3.5!" />
      {text.lesson.statuses[status]}
    </Badge>
  );
}

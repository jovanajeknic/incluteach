import { CheckCircle2, Eye, PencilLine, Send, type LucideIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/ui/badge';
import { text } from '@/text/sr-Latn';
import type { LessonStatus } from '../types';

// Each status has its own text and icon, so colour is never the only difference.
const statusAppearance: Record<LessonStatus, { icon: LucideIcon; className: string }> = {
  draft: { icon: PencilLine, className: 'border-[#d5d1c9] bg-[#efece6] text-[#3f4750]' },
  in_review: { icon: Eye, className: 'border-[#f0d9a8] bg-[#fdf2da] text-[#7a4a00]' },
  approved: { icon: CheckCircle2, className: 'border-[#c4d6f0] bg-[#e6eefa] text-[#1f4e8c]' },
  assigned: { icon: Send, className: 'border-[#b9ddd4] bg-[#e1f2ed] text-[#0d5b53]' },
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

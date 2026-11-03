import { CheckCircle2, Hourglass, type LucideIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { text } from '@/text/sr-Latn';

type Availability = 'inDemo' | 'comingSoon';

const appearance: Record<Availability, { icon: LucideIcon; className: string }> = {
  inDemo: { icon: CheckCircle2, className: 'border-navy/20 bg-navy-tint text-navy-deep' },
  comingSoon: { icon: Hourglass, className: 'border-sun/50 bg-sun-tint text-sun-ink' },
};

interface AvailabilityBadgeProps {
  availability: Availability;
  className?: string;
}

/** States plainly whether something already works in the demo or is still being prepared. */
export function AvailabilityBadge({ availability, className }: AvailabilityBadgeProps) {
  const { icon: Icon, className: tone } = appearance[availability];

  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold',
        tone,
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
      {text.landing.badges[availability]}
    </span>
  );
}

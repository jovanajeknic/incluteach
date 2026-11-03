import { CheckCircle2, Hourglass, type LucideIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { text } from '@/text/sr-Latn';

type Availability = 'inDemo' | 'comingSoon';

// White pills read clearly on any pastel surface; the icon and text carry the meaning.
const appearance: Record<Availability, { icon: LucideIcon; className: string }> = {
  inDemo: { icon: CheckCircle2, className: 'border-mint-deep text-mint-ink' },
  comingSoon: { icon: Hourglass, className: 'border-blush-deep text-blush-ink' },
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
        'inline-flex w-fit items-center gap-1.5 rounded-full border-2 bg-card px-3 py-1 font-display text-sm font-extrabold',
        tone,
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
      {text.landing.badges[availability]}
    </span>
  );
}

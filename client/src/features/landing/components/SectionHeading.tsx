import { cn } from '@/shared/lib/utils';

interface SectionHeadingProps {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
  align?: 'start' | 'center';
  className?: string;
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  intro,
  align = 'start',
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
      <p className="mb-3 text-sm font-bold tracking-[0.12em] text-navy uppercase">{eyebrow}</p>
      <h2
        id={id}
        className="font-display text-3xl leading-tight font-semibold tracking-tight text-balance text-ink sm:text-4xl lg:text-[2.75rem]"
      >
        {title}
      </h2>
      {intro && <p className="mt-4 text-lg text-ink-soft">{intro}</p>}
    </div>
  );
}

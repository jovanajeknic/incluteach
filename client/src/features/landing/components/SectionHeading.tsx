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
    <div
      data-reveal=""
      className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}
    >
      <p className="mb-4 inline-flex rounded-full bg-card px-4 py-1.5 font-display text-sm font-extrabold text-teal shadow-soft">
        {eyebrow}
      </p>
      <h2
        id={id}
        className="font-display text-3xl leading-tight font-extrabold tracking-tight text-balance text-ink sm:text-4xl lg:text-[2.75rem]"
      >
        {title}
      </h2>
      {intro && <p className="mt-4 text-lg text-ink-soft">{intro}</p>}
    </div>
  );
}

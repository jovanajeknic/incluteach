import { cn } from '@/shared/lib/utils';

type LogoTone = 'color' | 'mono' | 'inverse';

interface LogoMarkProps {
  className?: string;
  tone?: LogoTone;
}

/**
 * The IncluTeach symbol: three different paths that meet in one point, with a dot of
 * knowledge above them. Strokes use currentColor, so the mark works in one colour too.
 * Decorative by default; the wordmark or a surrounding label provides the name.
 */
export function LogoMark({ className, tone = 'color' }: LogoMarkProps) {
  const dotClassName = tone === 'mono' ? 'fill-current' : 'fill-apricot';

  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      focusable="false"
      className={cn('size-9 shrink-0', tone === 'color' && 'text-petrol', className)}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 34c0-9 12-9.5 12-17.5" />
        <path d="M20 34V16.5" />
        <path d="M32 34c0-9-12-9.5-12-17.5" />
      </g>
      <circle cx="20" cy="8.5" r="4.25" className={dotClassName} />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  tone?: LogoTone;
  markClassName?: string;
}

/** Symbol plus wordmark. The visible wordmark is the accessible name. */
export function Logo({ className, tone = 'color', markClassName }: LogoProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2.5',
        tone === 'inverse' ? 'text-paper' : 'text-ink',
        className,
      )}
    >
      <LogoMark tone={tone} className={markClassName} />
      <span className="font-display text-[1.375rem] leading-none font-semibold tracking-tight">
        Inclu
        <span className={cn(tone === 'color' && 'text-petrol')}>Teach</span>
      </span>
    </span>
  );
}

import type { CSSProperties, Ref } from 'react';
import { cn } from '@/shared/lib/utils';

type LogoTone = 'color' | 'mono' | 'inverse';

// Five learners of different colours behind one open book. Geometry follows the owner's
// logo; colours are the logo tokens (see docs/DESIGN.md).
const figures = [
  { color: 'var(--logo-figure-1)', head: [88.5, 101, 28.5], body: [53, 140, 71, 120] },
  { color: 'var(--logo-figure-2)', head: [168, 75, 28], body: [133, 114, 71, 146] },
  { color: 'var(--logo-figure-3)', head: [247.5, 54, 28], body: [212, 93.5, 72, 144.5] },
  { color: 'var(--logo-figure-4)', head: [327, 75, 28], body: [292, 114, 71, 146] },
  { color: 'var(--logo-figure-5)', head: [407, 101, 28.5], body: [372, 140, 71, 120] },
] as const;

const leftPage = 'M43 212C75 194 160 190 237 240V349C200 318 120 300 43 320Z';
const rightPage = 'M452 212C420 194 335 190 258 240V349C295 318 375 300 452 320Z';

interface LogoMarkProps {
  className?: string;
  tone?: LogoTone;
  style?: CSSProperties;
  ref?: Ref<SVGSVGElement>;
}

/**
 * The IncluTeach symbol. Decorative by default; a wordmark or a surrounding label
 * provides the name. In one colour, the pages get a knockout outline in the surface
 * colour (`--logo-knockout`) so they stay separate from the figures.
 */
export function LogoMark({ className, tone = 'color', style, ref }: LogoMarkProps) {
  const single = tone !== 'color';

  return (
    <svg
      ref={ref}
      viewBox="38 20 420 335"
      aria-hidden="true"
      focusable="false"
      className={cn('h-9 w-auto shrink-0', className)}
      style={style}
    >
      {figures.map(({ color, head, body }) => (
        <g key={color} fill={single ? 'currentColor' : color}>
          <circle cx={head[0]} cy={head[1]} r={head[2]} />
          <rect x={body[0]} y={body[1]} width={body[2]} height={body[3]} rx={body[2] / 2} />
        </g>
      ))}
      <g
        stroke={single ? 'var(--logo-knockout, var(--background))' : 'none'}
        strokeWidth={single ? 12 : 0}
        paintOrder="stroke"
      >
        <path d={leftPage} fill={single ? 'currentColor' : 'var(--logo-page-left)'} />
        <path d={rightPage} fill={single ? 'currentColor' : 'var(--logo-page-right)'} />
      </g>
    </svg>
  );
}

interface LogoProps {
  className?: string;
  tone?: LogoTone;
  markClassName?: string;
  markRef?: Ref<SVGSVGElement>;
  markStyle?: CSSProperties;
}

/** Symbol plus wordmark. The visible wordmark is the accessible name. */
export function Logo({ className, tone = 'color', markClassName, markRef, markStyle }: LogoProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2.5',
        tone === 'inverse' ? 'text-paper' : 'text-ink',
        className,
      )}
    >
      <LogoMark tone={tone} className={markClassName} ref={markRef} style={markStyle} />
      <span className="font-display text-[1.45rem] leading-none font-bold tracking-tight">
        IncluTeach
      </span>
    </span>
  );
}

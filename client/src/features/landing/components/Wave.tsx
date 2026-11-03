import { cn } from '@/shared/lib/utils';

interface WaveProps {
  /** Text colour class of the section that follows, e.g. `text-blush`; the wave is filled with it. */
  className?: string;
}

/** Soft curved edge between two sections of different colours. */
export function Wave({ className }: WaveProps) {
  return (
    <svg
      viewBox="0 0 1440 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      className={cn('block h-10 w-full sm:h-16 lg:h-20', className)}
    >
      <path
        d="M0 46C180 94 360 98 600 62S1080 0 1260 22c90 11 150 30 180 42v36H0Z"
        fill="currentColor"
      />
    </svg>
  );
}

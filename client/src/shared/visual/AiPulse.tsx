import { SparkleIcon } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/shared/lib/utils';

const sizes = {
  sm: { box: 'size-7', icon: 'size-4' },
  md: { box: 'size-10', icon: 'size-5' },
  lg: { box: 'size-20', icon: 'size-10' },
} as const;

/**
 * The "AI is working" sign: a sparkle that breathes, with rings fading outwards.
 * Decorative; the caller always shows the same state in words. With reduced motion it
 * stays still.
 */
export function AiPulse({
  size = 'md',
  className,
}: {
  size?: keyof typeof sizes;
  className?: string;
}) {
  const still = useReducedMotion();
  const { box, icon } = sizes[size];
  const ring = (delay: number) =>
    !still && (
      <motion.span
        className="absolute inset-0 rounded-full bg-lilac-deep"
        initial={{ scale: 1, opacity: 0.55 }}
        animate={{ scale: 1.9, opacity: 0 }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', delay }}
      />
    );

  return (
    <span aria-hidden="true" className={cn('relative inline-flex shrink-0', box, className)}>
      {ring(0)}
      {ring(0.9)}
      <motion.span
        className="relative flex size-full items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--brand-lilac-ink),var(--brand-sky-ink))] text-white shadow-[0_6px_20px_-6px_rgb(85_64_154/0.6)]"
        animate={still ? undefined : { scale: [1, 1.08, 1], rotate: [0, 8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <SparkleIcon weight="fill" className={icon} />
      </motion.span>
    </span>
  );
}

import { motion } from 'motion/react';
import type { ReactNode } from 'react';

const easeOutSoft = [0.2, 0.7, 0.3, 1] as const;

/** Each page rises in gently when it opens. Keyed by the caller, usually by pathname. */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easeOutSoft }}
    >
      {children}
    </motion.div>
  );
}

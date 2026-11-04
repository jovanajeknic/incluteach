import { motion } from 'motion/react';
import { ADAPTED_KINDS } from '@/features/school/types';
import { AiPulse } from '@/shared/visual/AiPulse';
import { blobShape } from '@/shared/visual/subjectIcons';
import { cn } from '@/shared/lib/utils';
import { text } from '@/text/sr-Latn';
import { versionAppearance } from './versionKinds';

/** Shown while the AI prepares every version of a lesson. */
export function AiWorkingPanel() {
  const t = text.lessonDetail;
  return (
    <section
      aria-live="polite"
      className="flex flex-col items-center rounded-[2.25rem] bg-[linear-gradient(160deg,var(--brand-lilac),var(--brand-sky))] px-6 py-12 text-center sm:py-16"
    >
      <AiPulse size="lg" />
      <h2 className="mt-8 font-display text-2xl font-semibold text-ink">{t.ai.working}</h2>
      <p className="mt-2 max-w-md text-ink-soft">{t.ai.workingHint}</p>
      <ul className="mt-8 flex flex-wrap justify-center gap-3">
        {ADAPTED_KINDS.map((kind, index) => {
          const { icon: KindIcon, tone } = versionAppearance[kind];
          return (
            <motion.li
              key={kind}
              initial={{ opacity: 0.35 }}
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
              className="flex items-center gap-2 rounded-2xl bg-card/70 py-1.5 pr-4 pl-1.5"
            >
              <span
                aria-hidden="true"
                className={cn('flex size-8 items-center justify-center', blobShape, tone)}
              >
                <KindIcon weight="duotone" className="size-4.5" />
              </span>
              <span className="font-display text-sm font-medium text-ink">{t.kinds[kind]}</span>
            </motion.li>
          );
        })}
      </ul>
      <p className="mt-8 text-sm text-ink-soft">{t.ai.demoNote}</p>
    </section>
  );
}

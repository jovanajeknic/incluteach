import { Check } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { text } from '@/text/sr-Latn';
import type { LessonStatus } from '../types';

const STEPS = ['draft', 'adapt', 'review', 'assign'] as const;

/** Index of the step the teacher is working on; past steps are done. */
function currentStepIndex(status: LessonStatus): number {
  switch (status) {
    case 'draft':
    case 'processing':
      return 1;
    case 'in_review':
      return 2;
    case 'approved':
      return 3;
    case 'assigned':
      return STEPS.length;
  }
}

export function WorkflowSteps({ status }: { status: LessonStatus }) {
  const t = text.lessonDetail.steps;
  const current = currentStepIndex(status);

  return (
    <nav aria-label={t.label}>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STEPS.map((step, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li
              key={step}
              aria-current={active ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-2xl border px-3 py-2 font-display text-sm',
                done && 'border-mint-deep bg-mint text-mint-ink',
                active && 'border-forest bg-card font-medium text-ink',
                !done && !active && 'bg-paper text-ink-soft',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  done ? 'bg-card text-mint-ink' : 'bg-card text-ink',
                )}
              >
                {done ? <Check className="size-4" /> : index + 1}
              </span>
              <span>
                {t[step]}
                {done && <span className="sr-only"> ({t.done})</span>}
                {active && <span className="sr-only"> ({t.current})</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

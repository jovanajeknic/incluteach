import { cn } from '@/shared/lib/utils';
import { text } from '@/text/sr-Latn';
import type { LessonStatus } from '../types';

const STEPS = ['draft', 'adapt', 'review', 'assign'] as const;

/** Index of the step the teacher is working on; earlier steps are done. */
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

/** A to-do list in the margin: finished steps are ticked and crossed out. */
export function WorkflowSteps({ status }: { status: LessonStatus }) {
  const t = text.lessonDetail.steps;
  const current = currentStepIndex(status);

  return (
    <nav aria-label={t.label}>
      <p aria-hidden="true" className="hand-note text-2xl text-ink-soft">
        {t.heading}
      </p>
      <ol className="mt-2 grid gap-2">
        {STEPS.map((step, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li
              key={step}
              aria-current={active ? 'step' : undefined}
              className="flex items-baseline gap-2"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'inline-flex w-5 justify-center font-hand text-xl',
                  done ? 'text-mint-ink' : 'text-ink-soft',
                )}
              >
                {done ? '✓' : `${index + 1}.`}
              </span>
              <span
                className={cn(
                  done && 'text-ink-soft line-through decoration-mint-deep decoration-2',
                  active && 'font-display font-bold text-ink',
                  !done && !active && 'text-ink-soft',
                )}
              >
                {t[step]}
                {done && <span className="sr-only"> ({t.done})</span>}
              </span>
              {active && <span className="hand-note text-lg text-blush-ink">← {t.current}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

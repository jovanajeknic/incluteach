import {
  ArrowCounterClockwiseIcon,
  BookOpenTextIcon,
  PuzzlePieceIcon,
  StarIcon,
  type Icon,
} from '@phosphor-icons/react';
import { cn } from '@/shared/lib/utils';
import { blobShape } from '@/shared/visual/subjectIcons';
import { text } from '@/text/sr-Latn';
import { childSummary } from '../childSummary';
import type { ChildData } from '../types';

/** Four small figures about one child: lessons done, quizzes done, stars, questions to repeat. */
export function ChildStats({ child, compact = false }: { child: ChildData; compact?: boolean }) {
  const t = text.parent.stats;
  const { total, done, quizzes, toRepeat } = childSummary(child);
  const items: { label: string; value: string; icon: Icon; tone: string }[] = [
    {
      label: t.lessons,
      value: t.ofTotal(done, total),
      icon: BookOpenTextIcon,
      tone: 'bg-mint text-mint-ink',
    },
    {
      label: t.quizzes,
      value: t.ofTotal(quizzes, total),
      icon: PuzzlePieceIcon,
      tone: 'bg-lilac text-lilac-ink',
    },
    {
      label: t.stars,
      value: String(child.stars),
      icon: StarIcon,
      tone: 'bg-butter text-butter-ink',
    },
    {
      label: t.toRepeat,
      value: String(toRepeat.length),
      icon: ArrowCounterClockwiseIcon,
      tone: 'bg-blush text-blush-ink',
    },
  ];

  return (
    <ul className={cn('grid grid-cols-2 gap-3', !compact && 'lg:grid-cols-4')}>
      {items.map(({ label, value, icon: ItemIcon, tone }) => (
        <li
          key={label}
          className={cn(
            'flex items-center gap-3',
            !compact && 'rounded-3xl bg-card p-4 shadow-soft',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'flex shrink-0 items-center justify-center',
              blobShape,
              tone,
              compact ? 'size-9' : 'size-12',
            )}
          >
            <ItemIcon weight="duotone" className={compact ? 'size-5' : 'size-6'} />
          </span>
          <span className="flex min-w-0 flex-col-reverse">
            <span className="text-sm text-ink-soft">{label}</span>
            <span
              className={cn(
                'font-display font-semibold text-ink',
                compact ? 'text-base' : 'text-xl',
              )}
            >
              {value}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

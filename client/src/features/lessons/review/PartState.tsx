import { CheckCircleIcon, SparkleIcon, WarningIcon } from '@phosphor-icons/react';
import { cn } from '@/shared/lib/utils';
import { text } from '@/text/sr-Latn';

interface PartStateProps {
  origin: 'ai' | 'teacher';
  status: 'draft' | 'approved';
  outdated: boolean;
}

/**
 * Says clearly what the summary or the quiz is: made by the AI and waiting for the teacher,
 * a draft of the teacher, or approved. A warning is added when the text changed after it
 * was made. Words and icons, never colour alone.
 */
export function PartState({ origin, status, outdated }: PartStateProps) {
  const t = text.teacher.review.state;
  const approved = status === 'approved';
  const StateIcon = approved ? CheckCircleIcon : SparkleIcon;

  return (
    <div className="mt-2 grid gap-2">
      <p
        className={cn(
          'inline-flex items-center gap-1.5 font-display text-sm font-medium',
          approved ? 'text-mint-ink' : origin === 'ai' ? 'text-lilac-ink' : 'text-ink-soft',
        )}
      >
        <StateIcon aria-hidden="true" weight="duotone" className="size-5" />
        {approved ? t.approved : origin === 'ai' ? t.aiDraft : t.teacherDraft}
      </p>
      {outdated && (
        <p className="flex items-start gap-2 rounded-2xl bg-butter px-4 py-3 font-medium text-butter-ink">
          <WarningIcon aria-hidden="true" weight="fill" className="mt-0.5 size-5 shrink-0" />
          {t.outdated}
        </p>
      )}
    </div>
  );
}

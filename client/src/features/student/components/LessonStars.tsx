import { StarIcon } from '@phosphor-icons/react';
import { cn } from '@/shared/lib/utils';
import { text } from '@/text/sr-Latn';

/** Two star slots per lesson: one for marking it as done, one for its quiz. */
export function LessonStars({
  lesson,
  quiz,
  className,
}: {
  lesson: boolean;
  quiz: boolean;
  className?: string;
}) {
  const count = Number(lesson) + Number(quiz);
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {[lesson, quiz].map((earned, index) => (
        <StarIcon
          key={index}
          aria-hidden="true"
          weight={earned ? 'fill' : 'duotone'}
          className={cn('size-6', earned ? 'text-butter-deep' : 'text-ink-soft/40')}
        />
      ))}
      <span className="sr-only">{text.student.subject.starsEarned(count)}</span>
    </span>
  );
}

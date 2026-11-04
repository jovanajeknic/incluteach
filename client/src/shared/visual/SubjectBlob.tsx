import type { Subject } from '@/features/student/types';
import { cn } from '@/shared/lib/utils';
import { blobShape, subjectTheme, teacherSubjectIcons } from './subjectIcons';

const sizes = {
  md: { box: 'size-12', icon: 'size-7' },
  lg: { box: 'size-16', icon: 'size-9' },
  xl: { box: 'size-24', icon: 'size-13' },
} as const;

/** A subject's icon on its own colour, in a soft hand-shaped blob. Decorative. */
export function SubjectBlob({
  subject,
  size = 'md',
  className,
}: {
  subject: Subject;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const SubjectIcon = teacherSubjectIcons[subject.icon];
  const theme = subjectTheme[subject.color];
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center',
        blobShape,
        sizes[size].box,
        theme.surface,
        theme.ink,
        className,
      )}
    >
      <SubjectIcon weight="duotone" className={sizes[size].icon} />
    </span>
  );
}

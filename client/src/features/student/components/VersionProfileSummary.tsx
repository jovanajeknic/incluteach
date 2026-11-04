import { CheckCircleIcon, MinusCircleIcon } from '@phosphor-icons/react';
import { versionAppearance } from '@/features/lessons/workflow/versionKinds';
import { cn } from '@/shared/lib/utils';
import { blobShape } from '@/shared/visual/subjectIcons';
import type { ReadingVersionKind, SupportProfile } from '../types';

/**
 * Read-only view of which versions a student receives: for parents, and for teachers who
 * are not the class teacher. Never shown to the student.
 */
export function VersionProfileSummary({
  profile,
  readingLabels,
  audioLabels,
}: {
  profile: SupportProfile;
  readingLabels: Record<ReadingVersionKind, string>;
  audioLabels: { yes: string; no: string };
}) {
  const { icon: ReadingIcon, tone } = versionAppearance[profile.readingVersion];
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-3">
      <li className="flex items-center gap-2 font-display font-medium text-ink">
        <span
          aria-hidden="true"
          className={cn('flex size-9 items-center justify-center', blobShape, tone)}
        >
          <ReadingIcon weight="duotone" className="size-5" />
        </span>
        {readingLabels[profile.readingVersion]}
      </li>
      <li
        className={cn(
          'flex items-center gap-2 font-display font-medium',
          profile.audio ? 'text-ink' : 'text-ink-soft',
        )}
      >
        {profile.audio ? (
          <CheckCircleIcon aria-hidden="true" weight="fill" className="size-6 text-mint-ink" />
        ) : (
          <MinusCircleIcon aria-hidden="true" weight="duotone" className="size-6" />
        )}
        {profile.audio ? audioLabels.yes : audioLabels.no}
      </li>
    </ul>
  );
}

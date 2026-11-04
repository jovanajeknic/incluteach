import { CheckIcon, ListChecksIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import {
  approvalProgress,
  hasUnpublishedChanges,
  isFullyApproved,
  isVersionApproved,
  useSchool,
} from '@/features/school/schoolContext';
import { ADAPTED_KINDS, type SchoolLesson } from '@/features/school/types';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { blobShape } from '@/shared/visual/subjectIcons';
import { text } from '@/text/sr-Latn';
import { versionAppearance } from './versionKinds';

/**
 * Sticks to the bottom of the screen: what is approved, and the button that sends the
 * lesson, or later changes to it, to the class once everything is approved.
 */
export function PublishBar({ lesson }: { lesson: SchoolLesson }) {
  const t = text.lessonDetail.publish;
  const school = useSchool();
  const { approved, total } = approvalProgress(lesson);
  const className = school.getClass(lesson.classId)?.name ?? lesson.classId;
  const published = lesson.status === 'assigned';
  const changes = published && hasUnpublishedChanges(lesson);
  const ready = isFullyApproved(lesson);
  const items = [
    ...ADAPTED_KINDS.map((kind) => ({
      key: kind,
      done: isVersionApproved(lesson, kind),
      ...versionAppearance[kind],
    })),
    {
      key: 'extras',
      done: lesson.extrasApproved === true,
      icon: ListChecksIcon,
      tone: 'bg-mint text-mint-ink',
    },
  ];

  const message = !published
    ? ready
      ? t.ready(className)
      : t.needsApproval
    : !changes
      ? t.published(className)
      : ready
        ? t.changesReady
        : t.changesWaiting;
  const showButton = !published || changes;

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky bottom-4 z-20 mt-10 flex flex-col gap-4 rounded-[1.75rem] border-2 border-mint-deep bg-mint px-5 py-4 text-ink shadow-lifted sm:flex-row sm:items-center sm:justify-between sm:px-6"
    >
      <div className="flex items-center gap-4">
        <ol className="flex -space-x-1.5" aria-hidden="true">
          {items.map(({ key, done, icon: ItemIcon, tone }) => (
            <li
              key={key}
              className={cn(
                'relative flex size-9 items-center justify-center ring-3 ring-mint transition-opacity',
                blobShape,
                tone,
                !done && 'opacity-40',
              )}
            >
              <ItemIcon weight="duotone" className="size-4.5" />
              {done && (
                <CheckIcon
                  weight="bold"
                  className="absolute -right-1 -bottom-1 size-4 rounded-full bg-ochre p-0.5 text-ink"
                />
              )}
            </li>
          ))}
        </ol>
        <div role="status" className="text-sm">
          <p className="font-display text-base font-semibold">{t.progress(approved, total)}</p>
          <p className="text-ink-soft">{message}</p>
        </div>
      </div>
      {showButton && (
        <Button
          type="button"
          disabled={!ready}
          onClick={() => school.publishLesson(lesson.id)}
          className="h-12 shrink-0 bg-ochre px-6 text-base text-ink shadow-[0_4px_0_#c9973a] hover:bg-butter-deep disabled:opacity-60"
        >
          <PaperPlaneTiltIcon aria-hidden="true" weight="duotone" />
          {published ? t.republish : t.button}
        </Button>
      )}
    </motion.div>
  );
}

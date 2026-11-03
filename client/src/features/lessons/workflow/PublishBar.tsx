import { CheckIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import {
  approvalProgress,
  findVersion,
  isFullyApproved,
  useSchool,
} from '@/features/school/schoolContext';
import { ADAPTED_KINDS, type SchoolLesson } from '@/features/school/types';
import { blobShape } from '@/features/teacher-ui/subjectIcons';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { versionAppearance } from './versionKinds';

/**
 * Sticks to the bottom of the screen: how many versions are approved, and the button that
 * sends the lesson to the class once all of them are.
 */
export function PublishBar({ lesson }: { lesson: SchoolLesson }) {
  const t = text.lessonDetail.publish;
  const school = useSchool();
  const { approved, total } = approvalProgress(lesson);
  const className = school.getClass(lesson.classId)?.name ?? lesson.classId;
  const published = lesson.status === 'assigned';
  const ready = isFullyApproved(lesson);

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky bottom-4 z-20 mt-10 flex flex-col gap-4 rounded-[1.75rem] bg-forest-deep px-5 py-4 text-paper shadow-lifted sm:flex-row sm:items-center sm:justify-between sm:px-6"
    >
      <div className="flex items-center gap-4">
        <ol className="flex -space-x-1.5" aria-hidden="true">
          {ADAPTED_KINDS.map((kind) => {
            const done = findVersion(lesson, kind)?.approvedByTeacher;
            const { icon: KindIcon, tone } = versionAppearance[kind];
            return (
              <li
                key={kind}
                className={cn(
                  'relative flex size-9 items-center justify-center ring-3 ring-forest-deep transition-opacity',
                  blobShape,
                  tone,
                  !done && 'opacity-40',
                )}
              >
                <KindIcon weight="duotone" className="size-4.5" />
                {done && (
                  <CheckIcon
                    weight="bold"
                    className="absolute -right-1 -bottom-1 size-4 rounded-full bg-ochre p-0.5 text-ink"
                  />
                )}
              </li>
            );
          })}
        </ol>
        <div role="status" className="text-sm">
          <p className="font-display text-base font-semibold">{t.progress(approved, total)}</p>
          <p className="text-paper/80">
            {published ? t.published(className) : ready ? t.ready(className) : t.needsApproval}
          </p>
        </div>
      </div>
      {!published && (
        <Button
          type="button"
          disabled={!ready}
          onClick={() => school.publishLesson(lesson.id)}
          className="h-12 shrink-0 bg-ochre px-6 text-base text-ink shadow-[0_4px_0_#c9973a] hover:bg-butter-deep disabled:opacity-60"
        >
          <PaperPlaneTiltIcon aria-hidden="true" weight="duotone" />
          {t.button}
        </Button>
      )}
    </motion.div>
  );
}

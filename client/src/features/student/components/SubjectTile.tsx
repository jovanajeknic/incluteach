import { ArrowRightIcon } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { subjectAppearance } from '@/features/lessons/subjectAppearance';
import { cn } from '@/shared/lib/utils';
import { SubjectCard } from '@/shared/visual/SubjectCard';
import { subjectTheme } from '@/shared/visual/subjectIcons';
import { text } from '@/text/sr-Latn';
import { useSubjectProgress } from '../api/queries';
import type { Enrollment } from '../api/studentApi';

interface SubjectTileProps {
  enrollment: Enrollment;
  /** Where the tile leads. */
  to: string;
  /** A parent looks at one child's progress. */
  studentId?: string;
}

/** A subject the student joined, as a card with how far they got. */
export function SubjectTile({ enrollment, to, studentId }: SubjectTileProps) {
  const t = text.pupil.home;
  const { subject } = enrollment;
  const appearance = subjectAppearance(subject.id, subject.name);
  const theme = subjectTheme[appearance.color];
  const progress = useSubjectProgress(subject.id, studentId);
  const published = progress.data?.lessons.published ?? 0;
  const done = progress.data?.lessons.completed ?? 0;

  return (
    <Link
      to={to}
      aria-label={`${subject.name}, ${text.pupil.subject.meta(subject.className)}`}
      className="block h-full rounded-[2rem]"
    >
      <SubjectCard subject={appearance}>
        <p className="mt-3 text-sm text-ink">
          {text.pupil.subject.meta(subject.className)}
          {subject.teacher && !subject.teacher.deleted && <> · {subject.teacher.fullName}</>}
        </p>
        <div className="mt-4 flex items-end justify-between gap-3">
          <span className="min-w-0">
            {progress.data ? (
              <>
                <span className={cn('block font-display font-semibold', theme.ink)}>
                  {t.lessonCount(published)}
                </span>
                {published > 0 && (
                  <>
                    <span className="block text-sm text-ink">{t.doneCount(done, published)}</span>
                    <span
                      aria-hidden="true"
                      className="mt-2 block h-2 w-32 overflow-hidden rounded-full bg-card/70"
                    >
                      <motion.span
                        className={cn('block h-full rounded-full', theme.deep)}
                        initial={{ width: 0 }}
                        animate={{ width: `${(done / published) * 100}%` }}
                        transition={{ duration: 0.8, ease: [0.2, 0.7, 0.3, 1] }}
                      />
                    </span>
                  </>
                )}
              </>
            ) : null}
          </span>
          <span
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card"
          >
            <ArrowRightIcon weight="bold" className={cn('size-5', theme.ink)} />
          </span>
        </div>
      </SubjectCard>
    </Link>
  );
}

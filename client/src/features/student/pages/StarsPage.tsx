import { CheckCircleIcon, StarIcon } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { cn } from '@/shared/lib/utils';
import { SubjectBlob } from '@/shared/visual/SubjectBlob';
import { text } from '@/text/sr-Latn';
import { LessonStars } from '../components/LessonStars';
import { useStudent } from '../data/studentContext';
import { studentLessonPath } from '../paths';

/** Every star the student has earned, lesson by lesson. Effort only: no scores, no ranking. */
export function StarsPage() {
  const t = text.student.stars;
  const { lessons, stars, starsFor, getSubject } = useStudent();

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">{t.heading}</h1>

      <div className="relative mt-6 flex flex-wrap items-center gap-6 overflow-hidden rounded-[2.25rem] bg-butter p-6 sm:p-8">
        <span
          aria-hidden="true"
          className="absolute -top-16 -right-10 size-52 rounded-full bg-butter-deep opacity-40"
        />
        <motion.span
          aria-hidden="true"
          initial={{ scale: 0.6, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14 }}
          className="relative flex size-24 items-center justify-center rounded-full bg-card shadow-soft"
        >
          <StarIcon weight="fill" className="size-14 text-butter-deep" />
        </motion.span>
        <div className="relative">
          <p className="font-display text-4xl font-bold text-ink">{t.total(stars)}</p>
          <p className="mt-1 max-w-md text-ink">{t.howTo}</p>
        </div>
      </div>

      {lessons.length === 0 ? (
        <p className="mt-8 text-lg text-ink-soft">{t.empty}</p>
      ) : (
        <ul className="mt-8 grid gap-3">
          {lessons.map((lesson, index) => {
            const subject = getSubject(lesson.subjectId);
            const earned = starsFor(lesson.id);
            return (
              <motion.li
                key={lesson.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.35 }}
                className="flex flex-wrap items-center gap-4 rounded-3xl bg-card px-5 py-4 shadow-soft"
              >
                {subject && <SubjectBlob subject={subject} />}
                <span className="min-w-0 flex-1">
                  <Link
                    to={studentLessonPath(lesson.id)}
                    className="block font-display text-lg font-semibold text-ink hover:text-forest"
                  >
                    {lesson.title}
                  </Link>
                  <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <StarReason label={t.lessonStar} earned={earned.lesson} />
                    <StarReason label={t.quizStar} earned={earned.quiz} />
                  </span>
                </span>
                <LessonStars lesson={earned.lesson} quiz={earned.quiz} />
              </motion.li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function StarReason({ label, earned }: { label: string; earned: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1',
        earned ? 'font-medium text-mint-ink' : 'text-ink-soft',
      )}
    >
      {earned && <CheckCircleIcon aria-hidden="true" weight="fill" className="size-4" />}
      {label}
      {!earned && `: ${text.student.stars.missing}`}
    </span>
  );
}

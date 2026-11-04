import { ArrowRightIcon, StarIcon } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { cn } from '@/shared/lib/utils';
import { itemMotion, listMotion } from '@/shared/motion/listMotion';
import { SubjectCard } from '@/shared/visual/SubjectCard';
import { subjectTheme } from '@/shared/visual/subjectIcons';
import { text } from '@/text/sr-Latn';
import { useStudent } from '../data/studentContext';
import { studentStarsPath, subjectPath } from '../paths';

export function StudentHomePage() {
  const t = text.student.home;
  const { profile, subjects, lessonsForSubject, progressOf, stars } = useStudent();

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-lg font-medium text-forest">
            {t.greeting(profile.firstName)}
          </p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">
            {t.heading}
          </h1>
        </div>
        <motion.div whileHover={{ rotate: -3, scale: 1.04 }} whileTap={{ scale: 0.97 }}>
          <Link
            to={studentStarsPath}
            className="flex items-center gap-3 rounded-3xl bg-butter px-5 py-3 shadow-soft"
          >
            <StarIcon aria-hidden="true" weight="fill" className="size-8 text-butter-deep" />
            <span>
              <span className="block font-display text-sm text-butter-ink">{t.starsLabel}</span>
              <span className="block font-display text-2xl leading-none font-bold text-ink">
                {stars}
              </span>
            </span>
          </Link>
        </motion.div>
      </div>

      <section aria-labelledby="subjects-heading" className="mt-10">
        <h2 id="subjects-heading" className="sr-only">
          {t.subjectsHeading}
        </h2>
        <motion.ul
          variants={listMotion}
          initial="hidden"
          animate="show"
          className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
        >
          {subjects.map((subject) => {
            const lessons = lessonsForSubject(subject.id);
            const done = lessons.filter((lesson) => progressOf(lesson.id) === 'completed').length;
            const theme = subjectTheme[subject.color];
            return (
              <motion.li key={subject.id} variants={itemMotion}>
                <Link to={subjectPath(subject.id)} className="block h-full rounded-[2rem]">
                  <SubjectCard subject={subject}>
                    <div className="mt-5 flex items-end justify-between gap-3">
                      <span className="min-w-0">
                        <span className={cn('block font-display font-semibold', theme.ink)}>
                          {t.lessonCount(lessons.length)}
                        </span>
                        {lessons.length > 0 && (
                          <>
                            <span className="block text-sm text-ink">
                              {t.doneCount(done, lessons.length)}
                            </span>
                            <span
                              aria-hidden="true"
                              className="mt-2 block h-2 w-32 overflow-hidden rounded-full bg-card/70"
                            >
                              <motion.span
                                className={cn('block h-full rounded-full', theme.deep)}
                                initial={{ width: 0 }}
                                animate={{ width: `${(done / lessons.length) * 100}%` }}
                                transition={{ duration: 0.8, ease: [0.2, 0.7, 0.3, 1] }}
                              />
                            </span>
                          </>
                        )}
                      </span>
                      <span
                        aria-hidden="true"
                        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card transition-transform group-hover:translate-x-1"
                      >
                        <ArrowRightIcon weight="bold" className={cn('size-5', theme.ink)} />
                      </span>
                    </div>
                  </SubjectCard>
                </Link>
              </motion.li>
            );
          })}
        </motion.ul>
      </section>
    </>
  );
}

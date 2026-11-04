import { ArrowLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { Link, useParams } from 'react-router';
import { MessagePage } from '@/shared/components/MessagePage';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { blobShape, subjectTheme } from '@/shared/visual/subjectIcons';
import { SubjectBlob } from '@/shared/visual/SubjectBlob';
import { text } from '@/text/sr-Latn';
import { LessonStars } from '../components/LessonStars';
import { ProgressBadge } from '../components/ProgressBadge';
import { useStudent } from '../data/studentContext';
import { studentHomePath, studentLessonPath } from '../paths';

export function SubjectPage() {
  const t = text.student.subject;
  const { subjectId = '' } = useParams();
  const { getSubject, lessonsForSubject, progressOf, starsFor } = useStudent();
  const subject = getSubject(subjectId);

  if (!subject) {
    return (
      <>
        <title>{text.app.pageTitle(t.notFoundTitle)}</title>
        <MessagePage
          title={t.notFoundTitle}
          description={t.notFoundDescription}
          action={
            <Button asChild variant="outline" size="lg">
              <Link to={studentHomePath}>{t.backToSubjects}</Link>
            </Button>
          }
        />
      </>
    );
  }

  const theme = subjectTheme[subject.color];
  const lessons = lessonsForSubject(subject.id);

  return (
    <>
      <title>{text.app.pageTitle(subject.name)}</title>
      <Link
        to={studentHomePath}
        className="inline-flex items-center gap-1.5 rounded-full font-display font-medium text-ink-soft hover:text-forest"
      >
        <ArrowLeftIcon aria-hidden="true" weight="bold" className="size-4" />
        {t.backToSubjects}
      </Link>

      <header
        className={cn('relative mt-5 overflow-hidden rounded-[2.25rem] p-6 sm:p-8', theme.surface)}
      >
        <span
          aria-hidden="true"
          className={cn(
            'absolute -right-14 -bottom-20 size-56 rounded-full opacity-40',
            theme.deep,
          )}
        />
        <div className="relative flex flex-wrap items-center gap-5">
          <SubjectBlob subject={subject} size="xl" className="bg-card" />
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">
            {subject.name}
          </h1>
        </div>
      </header>

      <section aria-labelledby="lessons-heading" className="mt-8">
        <h2 id="lessons-heading" className="font-display text-2xl font-semibold text-ink">
          {t.lessonsHeading}
        </h2>
        {lessons.length === 0 ? (
          <p className="mt-4 text-lg text-ink-soft">{t.empty}</p>
        ) : (
          <ol className="mt-4 grid gap-3">
            {lessons.map((lesson, index) => {
              const earned = starsFor(lesson.id);
              return (
                <motion.li
                  key={lesson.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.35 }}
                >
                  <Link
                    to={studentLessonPath(lesson.id)}
                    className="group flex items-center gap-4 rounded-3xl bg-card px-4 py-4 shadow-soft transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lifted sm:px-5"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex size-12 shrink-0 items-center justify-center font-display text-lg font-semibold',
                        blobShape,
                        theme.surface,
                        theme.ink,
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-lg font-semibold break-words text-ink">
                        {lesson.title}
                      </span>
                      <ProgressBadge progress={progressOf(lesson.id)} />
                    </span>
                    <LessonStars lesson={earned.lesson} quiz={earned.quiz} />
                    <CaretRightIcon
                      aria-hidden="true"
                      weight="bold"
                      className="hidden size-5 shrink-0 text-ink-soft transition-transform group-hover:translate-x-1 sm:block"
                    />
                  </Link>
                </motion.li>
              );
            })}
          </ol>
        )}
      </section>
    </>
  );
}

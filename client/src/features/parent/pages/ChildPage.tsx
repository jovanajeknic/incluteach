import {
  ArrowLeftIcon,
  CaretRightIcon,
  ChatsCircleIcon,
  PuzzlePieceIcon,
} from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { Link, useParams } from 'react-router';
import { LessonStars } from '@/features/student/components/LessonStars';
import { ProgressBadge } from '@/features/student/components/ProgressBadge';
import { VersionProfileSummary } from '@/features/student/components/VersionProfileSummary';
import { initialsOf } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { SubjectBlob } from '@/shared/visual/SubjectBlob';
import { blobShape, subjectTheme } from '@/shared/visual/subjectIcons';
import { text } from '@/text/sr-Latn';
import { childSummary, childTones, parentVersionLabels } from '../childSummary';
import { ChildStats } from '../components/ChildStats';
import { ForbiddenChild } from '../components/ForbiddenChild';
import { SuggestionsPanel } from '../components/SuggestionsPanel';
import { useParent } from '../data/parentContext';
import { childLessonPath, parentHomePath } from '../paths';

export function ChildPage() {
  const t = text.parent.child;
  const { childId = '' } = useParams();
  const { getChild, children, subjects: allSubjects } = useParent();
  const child = getChild(childId);

  if (!child) return <ForbiddenChild />;

  const { firstName, lastName, id } = child.profile;
  const tone = childTones[children.indexOf(child) % childTones.length]!;
  const { toRepeat } = childSummary(child);
  // Only subjects in which this child has lessons are listed.
  const subjects = allSubjects
    .map((subject) => ({
      subject,
      lessons: child.lessons.filter((lesson) => lesson.subjectId === subject.id),
    }))
    .filter((entry) => entry.lessons.length > 0);

  return (
    <>
      <title>{text.app.pageTitle(`${firstName} ${lastName}`)}</title>
      <Link
        to={parentHomePath}
        className="inline-flex items-center gap-1.5 rounded-full font-display font-medium text-ink-soft hover:text-forest"
      >
        <ArrowLeftIcon aria-hidden="true" weight="bold" className="size-4" />
        {t.backToChildren}
      </Link>

      <header className="mt-5 flex flex-wrap items-center gap-4">
        <span
          aria-hidden="true"
          className={cn(
            'flex size-18 items-center justify-center font-display text-2xl font-semibold',
            blobShape,
            tone,
          )}
        >
          {initialsOf(firstName, lastName)}
        </span>
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">
            {firstName} {lastName}
          </h1>
          {child.className && (
            <p className="text-ink-soft">{text.parent.home.classLabel(child.className)}</p>
          )}
        </div>
      </header>

      <section aria-labelledby="progress-heading" className="mt-8">
        <h2 id="progress-heading" className="sr-only">
          {t.progressHeading}
        </h2>
        <ChildStats child={child} />
      </section>

      {toRepeat.length > 0 && (
        <section
          aria-labelledby="repeat-heading"
          className="mt-6 rounded-[1.75rem] bg-blush/70 p-6"
        >
          <h2 id="repeat-heading" className="font-display text-xl font-semibold text-ink">
            {t.toRepeatHeading}
          </h2>
          <p className="mt-1 text-ink-soft">{t.toRepeatIntro}</p>
          <ul className="mt-3 grid gap-2">
            {toRepeat.map(({ lesson, question }) => (
              <li key={`${lesson.id}-${question.id}`} className="text-ink">
                <span className="font-medium">{question.question}</span>{' '}
                <span className="text-ink-soft">
                  ({question.options[question.correctIndex]} · {lesson.title})
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        aria-labelledby="profile-heading"
        className="mt-6 rounded-[1.75rem] bg-card p-6 shadow-soft"
      >
        <h2 id="profile-heading" className="font-display text-xl font-semibold text-ink">
          {t.profileHeading}
        </h2>
        <p className="mt-1 max-w-prose text-ink-soft">{t.profileIntro}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <VersionProfileSummary
            profile={child.profile.supportProfile}
            readingLabels={parentVersionLabels.reading}
            audioLabels={parentVersionLabels.audio}
          />
          <a
            href="#suggestions-heading"
            className="inline-flex items-center gap-1.5 font-display font-medium text-forest underline-offset-4 hover:underline"
          >
            <ChatsCircleIcon aria-hidden="true" weight="duotone" className="size-5" />
            {t.suggestChange}
          </a>
        </div>
      </section>

      <section aria-labelledby="child-lessons-heading" className="mt-10">
        <h2 id="child-lessons-heading" className="font-display text-2xl font-semibold text-ink">
          {t.lessonsHeading}
        </h2>
        <div className="mt-4 grid gap-5">
          {subjects.map(({ subject, lessons }) => {
            const theme = subjectTheme[subject.color];
            return (
              <div
                key={subject.id}
                className={cn('relative overflow-hidden rounded-[2rem] p-5 sm:p-6', theme.surface)}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute -top-12 -right-12 size-36 rounded-full opacity-50',
                    theme.deep,
                  )}
                />
                <h3 className="relative flex items-center gap-3 font-display text-xl font-semibold text-ink">
                  <SubjectBlob subject={subject} className="bg-card" />
                  {subject.name}
                </h3>
                <ul className="relative mt-4 grid gap-2">
                  {lessons.map((lesson, index) => (
                    <motion.li
                      key={lesson.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        to={childLessonPath(id, lesson.id)}
                        className="group flex flex-wrap items-center gap-x-4 gap-y-1 rounded-3xl bg-card px-5 py-4 transition-transform duration-200 hover:-translate-y-0.5"
                      >
                        <span className="min-w-0 flex-1 font-display text-lg font-semibold text-ink">
                          {lesson.title}
                        </span>
                        <ProgressBadge progress={child.progressOf(lesson.id)} />
                        {child.practiceOf(lesson.id) && (
                          <span className="inline-flex items-center gap-1.5 font-display text-sm font-medium text-lilac-ink">
                            <PuzzlePieceIcon
                              aria-hidden="true"
                              weight="duotone"
                              className="size-5"
                            />
                            {t.quizDone}
                          </span>
                        )}
                        <LessonStars
                          lesson={child.progressOf(lesson.id) === 'completed'}
                          quiz={child.practiceOf(lesson.id) !== undefined}
                        />
                        <CaretRightIcon
                          aria-hidden="true"
                          weight="bold"
                          className="hidden size-5 shrink-0 text-ink-soft transition-transform group-hover:translate-x-1 sm:block"
                        />
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-10">
        <SuggestionsPanel child={child} />
      </div>
    </>
  );
}

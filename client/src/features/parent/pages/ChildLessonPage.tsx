import {
  ArrowLeftIcon,
  CheckCircleIcon,
  CircleDashedIcon,
  HouseLineIcon,
  LightbulbIcon,
  PuzzlePieceIcon,
} from '@phosphor-icons/react';
import { Link, useParams } from 'react-router';
import { versionAppearance } from '@/features/lessons/workflow/versionKinds';
import { LessonContent } from '@/features/lesson-content/LessonContent';
import { LessonStars } from '@/features/student/components/LessonStars';
import { approvedVersion, pickLessonVersion } from '@/features/student/lessonVersion';
import type { PracticeRecord, StudentLesson } from '@/features/student/types';
import { MessagePage } from '@/shared/components/MessagePage';
import { formatDate } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { blobShape } from '@/shared/visual/subjectIcons';
import { text } from '@/text/sr-Latn';
import { ForbiddenChild } from '../components/ForbiddenChild';
import { SuggestionsPanel } from '../components/SuggestionsPanel';
import { useParent } from '../data/parentContext';
import { childPath } from '../paths';

function PracticeSummary({
  lesson,
  record,
}: {
  lesson: StudentLesson;
  record: PracticeRecord | undefined;
}) {
  const t = text.parent.lesson;
  const difficult = lesson.quiz.filter((question) =>
    record?.difficultQuestionIds.includes(question.id),
  );

  return (
    <section aria-labelledby="practice-heading" className="rounded-[1.75rem] bg-lilac p-6 sm:p-8">
      <h2
        id="practice-heading"
        className="flex items-center gap-3 font-display text-xl font-semibold text-ink"
      >
        <span
          aria-hidden="true"
          className={cn(
            'flex size-10 items-center justify-center bg-card text-lilac-ink',
            blobShape,
          )}
        >
          <PuzzlePieceIcon weight="duotone" className="size-5" />
        </span>
        {t.practiceHeading}
      </h2>
      {!record ? (
        <p className="mt-4 text-ink">{t.practiceNotDone}</p>
      ) : (
        <>
          <p className="mt-4 text-ink">{t.practiceDone(formatDate(record.completedAt))}</p>
          {difficult.length === 0 ? (
            <p className="mt-2 text-ink">{t.noDifficult}</p>
          ) : (
            <div className="mt-4 rounded-3xl bg-card p-5">
              <h3 className="font-display font-semibold text-ink">{t.difficultHeading}</h3>
              <p className="mt-1 text-ink-soft">{t.difficultIntro}</p>
              <ul className="mt-3 grid gap-2">
                {difficult.map((question) => (
                  <li key={question.id} className="text-ink">
                    <span className="font-medium">{question.question}</span>{' '}
                    <span className="text-ink-soft">
                      ({question.options[question.correctIndex]})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function ChildLessonPage() {
  const t = text.parent.lesson;
  const { childId = '', lessonId = '' } = useParams();
  const { getChild } = useParent();
  const child = getChild(childId);

  if (!child) return <ForbiddenChild />;

  const lesson = child.lessons.find((item) => item.id === lessonId);
  const version = lesson ? pickLessonVersion(lesson, child.profile.supportProfile) : undefined;
  if (!lesson || !version) {
    return (
      <>
        <title>{text.app.pageTitle(t.notFoundTitle)}</title>
        <MessagePage
          title={t.notFoundTitle}
          description={t.notFoundDescription}
          action={
            <Button asChild variant="outline" size="lg">
              <Link to={childPath(child.profile.id)}>{t.backToChild(child.profile.firstName)}</Link>
            </Button>
          }
        />
      </>
    );
  }

  const name = child.profile.firstName;
  const done = child.progressOf(lesson.id) === 'completed';
  const practice = child.practiceOf(lesson.id);
  const illustrations = approvedVersion(lesson, 'illustrations')?.illustrations ?? [];
  const { icon: VersionIcon, tone: versionTone } = versionAppearance[version.kind];

  return (
    <>
      <title>{text.app.pageTitle(`${lesson.title} · ${name}`)}</title>
      <Link
        to={childPath(child.profile.id)}
        className="inline-flex items-center gap-1.5 rounded-full font-display font-medium text-ink-soft hover:text-forest"
      >
        <ArrowLeftIcon aria-hidden="true" weight="bold" className="size-4" />
        {t.backToChild(name)}
      </Link>
      <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight text-ink">
        {lesson.title}
      </h1>
      <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 font-display font-medium',
            done ? 'text-mint-ink' : 'text-ink-soft',
          )}
        >
          {done ? (
            <CheckCircleIcon aria-hidden="true" weight="fill" className="size-5" />
          ) : (
            <CircleDashedIcon aria-hidden="true" weight="bold" className="size-5" />
          )}
          {done ? t.lessonDone : t.lessonNotDone}
        </span>
        <LessonStars lesson={done} quiz={practice !== undefined} />
      </p>

      <section aria-labelledby="version-heading" className="mt-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 id="version-heading" className="font-display text-xl font-semibold text-ink">
            {t.versionHeading(name)}
          </h2>
          <span className="inline-flex items-center gap-2 font-display font-medium text-ink">
            <span
              aria-hidden="true"
              className={cn('flex size-8 items-center justify-center', blobShape, versionTone)}
            >
              <VersionIcon weight="duotone" className="size-4.5" />
            </span>
            {t.versionNames[version.kind]}
          </span>
        </div>
        <div className="mt-4 rounded-[2rem] bg-card px-6 py-8 shadow-soft sm:px-10">
          <LessonContent
            content={version.content}
            glossary={lesson.glossary}
            className={cn(
              'text-lg text-ink',
              version.kind === 'dyslexia' && 'font-dyslexic leading-loose tracking-wide',
            )}
          />
          {illustrations.length > 0 && (
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {illustrations.map((item) => (
                <figure key={item.id}>
                  <img
                    src={item.src}
                    alt={item.alt}
                    className="w-full rounded-3xl border border-border bg-paper"
                  />
                  <figcaption className="mt-2 text-ink-soft">{item.caption}</figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <PracticeSummary lesson={lesson} record={practice} />
        {lesson.homeGuidance && lesson.homeGuidance.length > 0 && (
          <section
            aria-labelledby="home-heading"
            className="rounded-[1.75rem] bg-butter p-6 sm:p-8"
          >
            <h2
              id="home-heading"
              className="flex items-center gap-3 font-display text-xl font-semibold text-ink"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-10 items-center justify-center bg-card text-butter-ink',
                  blobShape,
                )}
              >
                <HouseLineIcon weight="duotone" className="size-5" />
              </span>
              {t.homeHeading}
            </h2>
            <ul className="mt-4 grid gap-3">
              {lesson.homeGuidance.map((tip) => (
                <li key={tip} className="flex gap-3 text-ink">
                  <LightbulbIcon
                    aria-hidden="true"
                    weight="duotone"
                    className="mt-0.5 size-5 shrink-0 text-butter-ink"
                  />
                  {tip}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="mt-10">
        <SuggestionsPanel child={child} lessonId={lesson.id} />
      </div>
    </>
  );
}

import { ArrowLeft, Home, Lightbulb, PencilLine } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { LessonContent } from '@/features/lesson-content/LessonContent';
import { pickLessonVersion } from '@/features/student/lessonVersion';
import type { PracticeRecord, StudentLesson } from '@/features/student/types';
import { MessagePage } from '@/shared/components/MessagePage';
import { formatDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
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
    <section aria-labelledby="practice-heading" className="rounded-3xl bg-lilac p-6 sm:p-8">
      <h2
        id="practice-heading"
        className="flex items-center gap-2 font-display text-xl font-bold text-ink"
      >
        <PencilLine aria-hidden="true" className="size-5 text-lilac-ink" />
        {t.practiceHeading}
      </h2>
      {!record ? (
        <p className="mt-3 text-ink">{t.practiceNotDone}</p>
      ) : (
        <>
          <p className="mt-3 text-ink">{t.practiceDone(formatDate(record.completedAt))}</p>
          {difficult.length === 0 ? (
            <p className="mt-2 text-ink">{t.noDifficult}</p>
          ) : (
            <div className="mt-4 rounded-2xl bg-card p-4">
              <h3 className="font-display font-bold text-ink">{t.difficultHeading}</h3>
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

  return (
    <>
      <title>{text.app.pageTitle(`${lesson.title} · ${name}`)}</title>
      <Link
        to={childPath(child.profile.id)}
        className="inline-flex items-center gap-2 rounded-full font-display font-medium text-forest hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-5" />
        {t.backToChild(name)}
      </Link>
      <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        {lesson.title}
      </h1>

      <section aria-labelledby="version-heading" className="mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="version-heading" className="font-display text-lg font-bold text-ink">
            {t.versionHeading(name)}
          </h2>
          <span className="rounded-full bg-sky px-3 py-1 font-display text-sm font-medium text-sky-ink">
            {t.versionNames[version.kind]}
          </span>
        </div>
        <div className="mt-4 rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
          <LessonContent content={version.content} glossary={lesson.glossary} />
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <PracticeSummary lesson={lesson} record={child.practiceOf(lesson.id)} />
        {lesson.homeGuidance && lesson.homeGuidance.length > 0 && (
          <section aria-labelledby="home-heading" className="rounded-3xl bg-butter p-6 sm:p-8">
            <h2
              id="home-heading"
              className="flex items-center gap-2 font-display text-xl font-bold text-ink"
            >
              <Home aria-hidden="true" className="size-5 text-butter-ink" />
              {t.homeHeading}
            </h2>
            <ul className="mt-3 grid gap-3">
              {lesson.homeGuidance.map((tip) => (
                <li key={tip} className="flex gap-3 text-ink">
                  <Lightbulb aria-hidden="true" className="mt-1 size-5 shrink-0 text-butter-ink" />
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

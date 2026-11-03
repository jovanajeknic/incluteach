import { ArrowLeftIcon, LockKeyIcon, StarIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { LessonStatusBadge } from '@/features/lessons/components/LessonStatusBadge';
import { classPath, lessonPath } from '@/features/lessons/paths';
import { versionAppearance } from '@/features/lessons/workflow/versionKinds';
import { SectionCard, StatusMessage } from '@/features/lessons/workflow/SectionCard';
import { useSchool } from '@/features/school/schoolContext';
import { ProgressBadge } from '@/features/student/components/ProgressBadge';
import { READING_VERSION_KINDS, type SupportProfile } from '@/features/student/types';
import { blobShape } from '@/features/teacher-ui/subjectIcons';
import { MessagePage } from '@/shared/components/MessagePage';
import { formatDate, initialsOf } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { SuggestionItem } from '../components/SuggestionItem';

/** Which versions the student receives. Teachers fill it in together with the parents. */
function VersionProfileEditor({
  studentId,
  profile,
}: {
  studentId: string;
  profile: SupportProfile;
}) {
  const t = text.studentView;
  const { setStudentSupport } = useSchool();
  const [draft, setDraft] = useState(profile);
  const [saved, setSaved] = useState(false);
  const AudioIcon = versionAppearance.audio.icon;

  function change(next: SupportProfile) {
    setDraft(next);
    setSaved(false);
  }

  return (
    <section
      aria-labelledby="profile-heading"
      className="rounded-[1.75rem] bg-card p-6 shadow-soft sm:p-8"
    >
      <h2 id="profile-heading" className="font-display text-2xl font-semibold text-ink">
        {t.profileHeading}
      </h2>
      <p className="mt-2 flex max-w-prose items-start gap-2 text-ink-soft">
        <LockKeyIcon
          aria-hidden="true"
          weight="duotone"
          className="mt-0.5 size-5 shrink-0 text-forest"
        />
        {t.profileIntro}
      </p>

      <fieldset className="mt-6">
        <legend className="mb-3 font-medium text-ink">{t.readingLabel}</legend>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {READING_VERSION_KINDS.map((kind) => {
            const { icon: KindIcon, tone } = versionAppearance[kind];
            return (
              <label
                key={kind}
                className="flex cursor-pointer items-center gap-3 rounded-3xl border-2 border-border bg-paper p-3 transition-colors has-[:checked]:border-forest has-[:checked]:bg-card has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-ring"
              >
                <input
                  type="radio"
                  name="reading-version"
                  value={kind}
                  checked={draft.readingVersion === kind}
                  onChange={() => change({ ...draft, readingVersion: kind })}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center',
                    blobShape,
                    tone,
                  )}
                >
                  <KindIcon weight="duotone" className="size-5" />
                </span>
                <span className="font-display font-medium text-ink">{t.readingOptions[kind]}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="mt-5 flex w-fit cursor-pointer items-center gap-3 rounded-3xl border-2 border-border bg-paper p-3 pr-5 has-[:checked]:border-forest has-[:checked]:bg-card">
        <input
          type="checkbox"
          checked={draft.audio}
          onChange={() => change({ ...draft, audio: !draft.audio })}
          className="size-5 shrink-0 accent-forest"
        />
        <span
          aria-hidden="true"
          className={cn(
            'flex size-10 items-center justify-center',
            blobShape,
            versionAppearance.audio.tone,
          )}
        >
          <AudioIcon weight="duotone" className="size-5" />
        </span>
        <span className="font-display font-medium text-ink">{t.audioLabel}</span>
      </label>

      <Button
        type="button"
        onClick={() => {
          setStudentSupport(studentId, draft);
          setSaved(true);
        }}
        className="mt-6 h-11 px-6"
      >
        {t.saveProfile}
      </Button>
      <StatusMessage message={saved ? t.profileSaved : undefined} />
    </section>
  );
}

export function TeacherStudentPage() {
  const t = text.studentView;
  const { studentId = '' } = useParams();
  const school = useSchool();
  const student = school.getStudent(studentId);

  if (!student || !school.teachesStudent(studentId)) {
    return (
      <>
        <title>{text.app.pageTitle(t.forbiddenTitle)}</title>
        <MessagePage
          title={t.forbiddenTitle}
          description={t.forbiddenDescription}
          action={
            <Button asChild variant="outline" size="lg">
              <Link to={classPath}>{t.backToClass}</Link>
            </Button>
          }
        />
      </>
    );
  }

  const group = school.classOf(studentId);
  const lessons = school.visibleLessonsFor(studentId);
  const stars = lessons.filter(
    (lesson) => school.progressOf(studentId, lesson.id) === 'completed',
  ).length;
  const suggestions = school.data.suggestions.filter((item) => item.childId === studentId);

  return (
    <>
      <title>{text.app.pageTitle(`${student.firstName} ${student.lastName}`)}</title>
      <Link
        to={classPath}
        className="inline-flex items-center gap-1.5 rounded-full font-display font-medium text-ink-soft hover:text-forest"
      >
        <ArrowLeftIcon aria-hidden="true" weight="bold" className="size-4" />
        {t.backToClass}
      </Link>

      <header className="mt-5 mb-8 flex flex-wrap items-center gap-4">
        <span
          aria-hidden="true"
          className={cn(
            'flex size-16 items-center justify-center bg-sky font-display text-xl font-semibold text-sky-ink',
            blobShape,
          )}
        >
          {initialsOf(student.firstName, student.lastName)}
        </span>
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">
            {student.firstName} {student.lastName}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 text-ink-soft">
            {group && <span>{t.classLabel(group.name)}</span>}
            <span className="inline-flex items-center gap-1.5 font-display font-semibold text-butter-ink">
              <StarIcon aria-hidden="true" weight="fill" className="size-5 text-butter-deep" />
              {text.classView.starsCount(stars)}
            </span>
          </p>
        </div>
      </header>

      <div className="grid gap-10">
        <VersionProfileEditor studentId={studentId} profile={student.supportProfile} />

        <SectionCard id="student-lessons-heading" title={t.progressHeading}>
          {lessons.length === 0 ? (
            <p className="text-ink-soft">{t.noLessons}</p>
          ) : (
            <ul className="grid gap-3">
              {lessons.map((lesson) => {
                const practice = school.practiceOf(studentId, lesson.id);
                const difficult = lesson.quiz.filter((question) =>
                  practice?.difficultQuestionIds.includes(question.id),
                );
                return (
                  <li key={lesson.id} className="rounded-3xl bg-card p-5 shadow-soft">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        to={lessonPath(lesson.id)}
                        className="font-display text-lg font-semibold text-ink underline-offset-4 hover:text-forest hover:underline"
                      >
                        {lesson.title}
                      </Link>
                      <span className="flex flex-wrap items-center gap-3">
                        <ProgressBadge progress={school.progressOf(studentId, lesson.id)} />
                        <LessonStatusBadge status={lesson.status} />
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-ink-soft">
                      {practice ? t.quizDone(formatDate(practice.completedAt)) : t.quizNotDone}
                    </p>
                    {difficult.length > 0 && (
                      <p className="mt-1 text-sm text-ink">
                        <span className="font-medium">{t.difficult}</span>{' '}
                        {difficult.map((question) => question.question).join(' · ')}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard id="student-suggestions-heading" title={t.suggestionsHeading}>
          {suggestions.length === 0 ? (
            <p className="text-ink-soft">{t.noSuggestions}</p>
          ) : (
            <ul className="grid gap-3">
              {suggestions.map((suggestion) => (
                <SuggestionItem key={suggestion.id} suggestion={suggestion} showStudent={false} />
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </>
  );
}

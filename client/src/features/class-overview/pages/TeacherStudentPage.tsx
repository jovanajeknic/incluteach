import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { LessonStatusBadge } from '@/features/lessons/components/LessonStatusBadge';
import { classPath, lessonPath } from '@/features/lessons/paths';
import { useSchool } from '@/features/school/schoolContext';
import { ProgressBadge } from '@/features/student/components/ProgressBadge';
import type { SupportProfile } from '@/features/student/types';
import { MessagePage } from '@/shared/components/MessagePage';
import { formatDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { SectionCard, StatusMessage } from '@/features/lessons/workflow/SectionCard';
import { SuggestionItem } from '../components/SuggestionItem';

type NeedKey = 'preferSimplifiedText' | 'preferMoreExamples' | 'preferStepByStep' | 'easierReading';
const NEED_KEYS: NeedKey[] = [
  'preferSimplifiedText',
  'preferMoreExamples',
  'preferStepByStep',
  'easierReading',
];

function NeedsEditor({ studentId, needs }: { studentId: string; needs: SupportProfile }) {
  const t = text.studentView;
  const { setStudentNeeds } = useSchool();
  const [draft, setDraft] = useState(needs);
  const [saved, setSaved] = useState(false);

  const isChecked = (key: NeedKey) =>
    key === 'easierReading' ? draft.readingPreset === 'easier-reading' : draft[key];

  function toggle(key: NeedKey) {
    setSaved(false);
    setDraft((current) =>
      key === 'easierReading'
        ? {
            ...current,
            readingPreset:
              current.readingPreset === 'easier-reading' ? 'standard' : 'easier-reading',
          }
        : { ...current, [key]: !current[key] },
    );
  }

  return (
    <SectionCard id="needs-heading" title={t.needsHeading} intro={t.needsIntro}>
      <fieldset>
        <legend className="sr-only">{t.needsHeading}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {NEED_KEYS.map((key) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-border bg-paper px-4 py-3 text-ink has-[:checked]:border-forest has-[:checked]:bg-mint"
            >
              <input
                type="checkbox"
                checked={isChecked(key)}
                onChange={() => toggle(key)}
                className="size-5 shrink-0 accent-forest"
              />
              {text.needs[key]}
            </label>
          ))}
        </div>
      </fieldset>
      <Button
        type="button"
        onClick={() => {
          setStudentNeeds(studentId, draft);
          setSaved(true);
        }}
        className="mt-4 h-11 px-5"
      >
        {t.saveNeeds}
      </Button>
      <StatusMessage message={saved ? t.needsSaved : undefined} />
    </SectionCard>
  );
}

export function TeacherStudentPage() {
  const t = text.studentView;
  const { studentId = '' } = useParams();
  const school = useSchool();
  const student = school.getStudent(studentId);
  const inOwnClass = school.data.teacher.classIds.some((id) =>
    school.getClass(id)?.studentIds.includes(studentId),
  );

  if (!student || !inOwnClass) {
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

  const lessons = school.visibleLessonsFor(studentId);
  const suggestions = school.data.suggestions.filter((item) => item.childId === studentId);

  return (
    <>
      <title>{text.app.pageTitle(`${student.firstName} ${student.lastName}`)}</title>
      <Link
        to={classPath}
        className="inline-flex items-center gap-2 rounded-full font-display font-medium text-forest hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t.backToClass}
      </Link>
      <h1 className="mt-6 mb-8 font-display text-3xl font-bold tracking-tight text-ink">
        {student.firstName} {student.lastName}
      </h1>

      <div className="grid gap-6">
        <NeedsEditor studentId={studentId} needs={student.supportProfile} />

        <SectionCard id="student-lessons-heading" title={t.lessonsHeading}>
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
                  <li key={lesson.id} className="rounded-2xl bg-paper p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        to={lessonPath(lesson.id)}
                        className="font-display font-medium text-ink underline-offset-4 hover:text-forest hover:underline"
                      >
                        {lesson.title}
                      </Link>
                      <span className="flex flex-wrap gap-2">
                        <ProgressBadge progress={school.progressOf(studentId, lesson.id)} />
                        <LessonStatusBadge status={lesson.status} />
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-ink-soft">
                      {practice
                        ? t.practiceDone(formatDate(practice.completedAt))
                        : t.practiceNotDone}
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

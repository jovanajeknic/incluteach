import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { currentSchoolYear, schoolYearLabel } from '@/shared/lib/schoolYear';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { text } from '@/text/sr-Latn';
import { SUBJECTS_PAGE_SIZE, useClasses, useSubjects, useTeachers } from '../api/queries';
import { AddSubjectForm } from '../components/AddSubjectForm';
import { SubjectRow } from '../components/SubjectRow';

const t = text.admin.subjects;

/** The next year, so the subjects can be prepared before 1 September, and a few past ones. */
function yearChoices(current: number): number[] {
  return [current + 1, current, current - 1, current - 2, current - 3];
}

/** A year from a link, or the current one when the link has none or a strange one. */
function yearFromLink(value: string | null, fallback: number): number {
  const year = Number(value);
  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : fallback;
}

/** "Predmeti": a name in one odeljenje with its teacher, for one school year. */
export function SubjectsPage() {
  const current = currentSchoolYear();
  // The page of the odeljenja links here with the year and the odeljenje already chosen.
  const [params] = useSearchParams();
  const [year, setYear] = useState(yearFromLink(params.get('schoolYear'), current));
  const [classId, setClassId] = useState(params.get('classId') ?? '');
  const [teacherId, setTeacherId] = useState('');
  const [limit, setLimit] = useState(SUBJECTS_PAGE_SIZE);
  // What an action did or why it failed; the page keeps it because the row may be gone.
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const classes = useClasses(year);
  const teachers = useTeachers();
  const subjects = useSubjects({
    schoolYear: year,
    classId: classId || undefined,
    teacherId: teacherId || undefined,
    limit,
  });
  const filtered = Boolean(classId || teacherId);
  const classList = classes.data?.classes ?? [];
  const allTeachers = teachers.data?.users ?? [];
  const activeTeachers = allTeachers.filter((person) => !person.deactivatedAt);

  function tell(message: string) {
    setProblem(null);
    setNotice(message);
  }

  function complain(message: string) {
    setNotice(null);
    setProblem(message);
  }

  function changeFilter(change: () => void) {
    change();
    setLimit(SUBJECTS_PAGE_SIZE);
    setNotice(null);
    setProblem(null);
  }

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">{t.heading}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{t.intro}</p>

      <div className="mt-6 grid max-w-4xl gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="subjects-year" className="text-base">
            {t.yearLabel}
          </Label>
          <NativeSelect
            id="subjects-year"
            value={year}
            onChange={(event) =>
              changeFilter(() => {
                setYear(Number(event.target.value));
                // The odeljenja belong to a year, so the one chosen no longer exists.
                setClassId('');
              })
            }
            className="h-12 rounded-xl bg-card text-base"
          >
            {yearChoices(current).map((choice) => (
              <NativeSelectOption key={choice} value={choice}>
                {choice === current
                  ? t.yearCurrent(schoolYearLabel(choice))
                  : schoolYearLabel(choice)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="subjects-class" className="text-base">
            {t.classLabel}
          </Label>
          <NativeSelect
            id="subjects-class"
            value={classId}
            onChange={(event) => changeFilter(() => setClassId(event.target.value))}
            className="h-12 rounded-xl bg-card text-base"
          >
            <NativeSelectOption value="">{t.classAll}</NativeSelectOption>
            {classList.map((item) => (
              <NativeSelectOption key={item.id} value={item.id}>
                {item.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="subjects-teacher" className="text-base">
            {t.teacherLabel}
          </Label>
          <NativeSelect
            id="subjects-teacher"
            value={teacherId}
            onChange={(event) => changeFilter(() => setTeacherId(event.target.value))}
            className="h-12 rounded-xl bg-card text-base"
          >
            <NativeSelectOption value="">{t.teacherAll}</NativeSelectOption>
            {allTeachers.map((person) => (
              <NativeSelectOption key={person.id} value={person.id}>
                {person.fullName}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div role="status" aria-live="polite" className="mt-4 max-w-4xl empty:hidden">
        {notice && (
          <p className="rounded-2xl bg-mint px-4 py-3 font-medium text-mint-ink">{notice}</p>
        )}
      </div>
      {problem && (
        <p
          role="alert"
          className="mt-4 max-w-4xl rounded-2xl bg-blush px-4 py-3 font-medium text-blush-ink"
        >
          {problem}
        </p>
      )}

      <section aria-label={t.resultsLabel} className="mt-6 max-w-4xl">
        {subjects.isPending ? (
          <LoadingState label={text.admin.load.loading} />
        ) : subjects.isError ? (
          <ErrorState onRetry={() => void subjects.refetch()} />
        ) : subjects.data.subjects.length === 0 ? (
          <p className="text-lg text-ink-soft">
            {filtered ? t.empty : t.noSubjects(schoolYearLabel(year))}
          </p>
        ) : (
          <>
            <ul className="grid gap-3">
              {subjects.data.subjects.map((subject) => (
                <li key={subject.id}>
                  <SubjectRow
                    subject={subject}
                    teachers={activeTeachers}
                    onNotice={tell}
                    onProblem={complain}
                  />
                </li>
              ))}
            </ul>
            {subjects.data.total > subjects.data.subjects.length && (
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={subjects.isPlaceholderData}
                  onClick={() => setLimit((value) => value + SUBJECTS_PAGE_SIZE)}
                >
                  {t.showMore}
                </Button>
                <span className="text-sm text-ink-soft">
                  {t.shown(subjects.data.subjects.length, subjects.data.total)}
                </span>
              </div>
            )}
          </>
        )}
      </section>

      <AddSubjectForm
        schoolYear={year}
        classes={classList}
        teachers={activeTeachers}
        onAdded={(name) => tell(t.added(name))}
        onProblem={complain}
      />
    </>
  );
}

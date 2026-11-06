import { useState } from 'react';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { currentSchoolYear, schoolYearLabel } from '@/shared/lib/schoolYear';
import { Label } from '@/shared/ui/label';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { text } from '@/text/sr-Latn';
import { useClasses } from '../api/queries';
import { AddClassForm } from '../components/AddClassForm';
import { ClassRow } from '../components/ClassRow';

const t = text.admin.classes;

/** The next year, so the odeljenja can be prepared before 1 September, and a few past ones. */
function yearChoices(current: number): number[] {
  return [current + 1, current, current - 1, current - 2, current - 3];
}

/** "Odeljenja": the classes of one school year, which are added, renamed and deleted here. */
export function ClassesPage() {
  const current = currentSchoolYear();
  const [year, setYear] = useState(current);
  const classes = useClasses(year);
  // What an action did or why it failed; the page keeps it because the row may be gone.
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  function tell(message: string) {
    setProblem(null);
    setNotice(message);
  }

  function complain(message: string) {
    setNotice(null);
    setProblem(message);
  }

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">{t.heading}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{t.intro}</p>

      <div className="mt-6 grid max-w-xs gap-2">
        <Label htmlFor="classes-year" className="text-base">
          {t.yearLabel}
        </Label>
        <NativeSelect
          id="classes-year"
          value={year}
          onChange={(event) => {
            setYear(Number(event.target.value));
            setNotice(null);
            setProblem(null);
          }}
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

      <div role="status" aria-live="polite" className="mt-4 max-w-3xl empty:hidden">
        {notice && (
          <p className="rounded-2xl bg-mint px-4 py-3 font-medium text-mint-ink">{notice}</p>
        )}
      </div>
      {problem && (
        <p
          role="alert"
          className="mt-4 max-w-3xl rounded-2xl bg-blush px-4 py-3 font-medium text-blush-ink"
        >
          {problem}
        </p>
      )}

      <section aria-label={t.resultsLabel} className="mt-6 max-w-3xl">
        {classes.isPending ? (
          <LoadingState label={text.admin.load.loading} />
        ) : classes.isError ? (
          <ErrorState onRetry={() => void classes.refetch()} />
        ) : classes.data.classes.length === 0 ? (
          <p className="text-lg text-ink-soft">{t.empty(schoolYearLabel(year))}</p>
        ) : (
          <ul className="grid gap-3">
            {classes.data.classes.map((item) => (
              <li key={item.id}>
                <ClassRow item={item} onNotice={tell} onProblem={complain} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <AddClassForm
        schoolYear={year}
        onAdded={(name) => tell(t.added(name))}
        onProblem={complain}
      />
    </>
  );
}

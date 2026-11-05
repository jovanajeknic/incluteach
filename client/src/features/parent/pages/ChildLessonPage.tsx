import { ArrowLeftIcon, CheckCircleIcon, CircleIcon } from '@phosphor-icons/react';
import { Link, useParams } from 'react-router';
import { useChildLesson, useSubjectProgress } from '@/features/student/api/queries';
import type { ChildLesson } from '@/features/student/api/studentApi';
import { LessonReader } from '@/features/student/components/LessonReader';
import { TryHistory } from '@/features/student/components/TryHistory';
import { ApiError } from '@/shared/api/apiClient';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { MessagePage } from '@/shared/components/MessagePage';
import { formatDate } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { displayInScript, type Script } from '@/shared/script/serbianScript';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { ChildGate } from '../components/ChildGate';
import { childPath, childSubjectPath } from '../paths';

const t = text.guardian.lesson;

/**
 * A lesson of one child, read the way the child reads it, and what the parent may see of it:
 * whether the child finished it, the questions of the quiz, and every try with each answer.
 */
export function ChildLessonPage() {
  const { childId = '', lessonId = '' } = useParams();

  return (
    <ChildGate childId={childId}>
      {(child) => <ChildLessonView childId={child.id} name={child.fullName} lessonId={lessonId} />}
    </ChildGate>
  );
}

function ChildLessonView({
  childId,
  name,
  lessonId,
}: {
  childId: string;
  name: string;
  lessonId: string;
}) {
  const lesson = useChildLesson(lessonId);

  if (lesson.isPending) return <LoadingState label={text.pupil.load.loading} />;

  if (lesson.isError) {
    const missing =
      lesson.error instanceof ApiError &&
      (lesson.error.status === 404 || lesson.error.status === 403);
    if (!missing) return <ErrorState onRetry={() => void lesson.refetch()} />;
    return (
      <>
        <title>{text.app.pageTitle(t.notFoundTitle)}</title>
        <MessagePage
          title={t.notFoundTitle}
          description={t.notFoundDescription}
          action={
            <Button asChild variant="outline" size="lg">
              <Link to={childPath(childId)}>{text.guardian.subject.back(name)}</Link>
            </Button>
          }
        />
      </>
    );
  }

  const data = lesson.data;
  return (
    <LessonReader
      lesson={data}
      back={
        <Link
          to={childSubjectPath(childId, data.subject.id)}
          className="inline-flex items-center gap-1.5 rounded-full font-display font-medium text-ink-soft hover:text-forest print:hidden"
        >
          <ArrowLeftIcon aria-hidden="true" weight="bold" className="size-4" />
          {text.pupil.lesson.backToSubject(data.subject.name)}
        </Link>
      }
      below={(preferences) => (
        <>
          <FinishedNote childId={childId} lesson={data} />
          {data.quiz && <QuizQuestions lesson={data} script={preferences.script} />}
          {data.quiz && (
            <TryHistory lessonId={data.id} studentId={childId} script={preferences.script} />
          )}
        </>
      )}
    />
  );
}

/** Whether the child finished the lesson: the server counts it only after "Završi lekciju". */
function FinishedNote({ childId, lesson }: { childId: string; lesson: ChildLesson }) {
  const progress = useSubjectProgress(lesson.subject.id, childId);
  const item = progress.data?.items.find((entry) => entry.id === lesson.id);
  if (!item) return null;

  return (
    <p
      className={cn(
        'mt-8 flex items-center gap-2 text-lg font-medium print:hidden',
        item.completed ? 'text-mint-ink' : 'text-ink-soft',
      )}
    >
      {item.completed ? (
        <CheckCircleIcon aria-hidden="true" weight="fill" className="size-6" />
      ) : (
        <CircleIcon aria-hidden="true" weight="bold" className="size-6" />
      )}
      {item.completed && item.completedAt
        ? t.finishedAt(formatDate(item.completedAt))
        : t.notFinished}
    </p>
  );
}

/** The questions of the quiz and their answers, without saying which is right. */
function QuizQuestions({ lesson, script }: { lesson: ChildLesson; script: Script }) {
  const show = (value: string) => displayInScript(value, script);
  const questions = lesson.quiz?.questions ?? [];

  return (
    <section aria-labelledby="questions-heading" className="mt-10 print:hidden">
      <h2 id="questions-heading" className="font-display text-2xl font-semibold text-ink">
        {t.questionsHeading}
      </h2>
      <details className="mt-3">
        <summary className="inline-flex cursor-pointer rounded-full border-2 border-forest/25 px-5 py-2 font-display font-semibold text-forest hover:border-forest">
          {t.showQuestions}
        </summary>
        <p className="mt-3 text-sm text-ink-soft">{t.questionsHint}</p>
        <ol className="mt-4 grid gap-4">
          {questions.map((question, index) => (
            <li key={question.id} className="rounded-3xl bg-card p-5 shadow-soft">
              <p className="font-display font-semibold text-ink">
                {t.questionNumber(index + 1)} · {t.kinds[question.kind]}
              </p>
              <p className="mt-1 text-ink">{show(question.prompt)}</p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-ink">
                {question.options.map((option) => (
                  <li key={option.id}>{show(option.text)}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}

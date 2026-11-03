import { useNavigate } from 'react-router';
import { PageHeader } from '@/shared/components/PageHeader';
import { text } from '@/text/sr-Latn';
import { LessonForm } from '../components/LessonForm';
import { useLessons } from '../data/lessonsContext';
import { lessonPath, teacherHomePath } from '../paths';
import type { NewLessonInput } from '../types';

export interface LessonDetailLocationState {
  justCreated?: boolean;
}

export function NewLessonPage() {
  const t = text.newLesson;
  const { createDraft } = useLessons();
  const navigate = useNavigate();

  function handleSubmit(input: NewLessonInput) {
    const lesson = createDraft(input);
    const state: LessonDetailLocationState = { justCreated: true };
    navigate(lessonPath(lesson.id), { state });
  }

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <PageHeader title={t.heading} description={t.intro} />
      <div className="max-w-3xl rounded-xl border bg-card p-5 shadow-sm sm:p-8">
        <LessonForm onSubmit={handleSubmit} onCancel={() => navigate(teacherHomePath)} />
      </div>
    </>
  );
}

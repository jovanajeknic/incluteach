import { describe, expect, it } from 'vitest';
import { validateLessonForm, type LessonFormValues } from './lessonForm';

const teaching = [
  { subjectId: 'priroda', classId: '4-2' },
  { subjectId: 'matematika', classId: '4-1' },
];

const valid: LessonFormValues = {
  course: 'priroda|4-2',
  title: 'Kruženje vode',
  content: 'Voda isparava.',
};

describe('validateLessonForm', () => {
  it('accepts valid values, trims them and splits the course', () => {
    const result = validateLessonForm(
      { ...valid, title: '  Kruženje vode  ', content: '\n Voda isparava. \n' },
      teaching,
    );
    expect(result).toEqual({
      ok: true,
      data: {
        title: 'Kruženje vode',
        content: 'Voda isparava.',
        subjectId: 'priroda',
        classId: '4-2',
      },
    });
  });

  it('reports every missing field', () => {
    const result = validateLessonForm({ course: '', title: '', content: '' }, teaching);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(['content', 'course', 'title']);
  });

  it('treats whitespace-only text as empty', () => {
    const result = validateLessonForm({ ...valid, title: '   ', content: ' \n ' }, teaching);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveProperty('title');
    expect(result.errors).toHaveProperty('content');
    expect(result.errors).not.toHaveProperty('course');
  });

  it.each(['matematika|4-2', 'hemija|4-2', 'priroda', ''])(
    'rejects a subject the teacher does not teach in that class: %s',
    (course) => {
      expect(validateLessonForm({ ...valid, course }, teaching).ok).toBe(false);
    },
  );
});

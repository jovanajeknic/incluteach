import { describe, expect, it } from 'vitest';
import { validateLessonForm, type LessonFormValues } from './lessonForm';

const subjectIds = ['priroda', 'matematika'];

const valid: LessonFormValues = {
  title: 'Kruženje vode',
  subjectId: 'priroda',
  grade: '4',
  content: 'Voda isparava.',
};

describe('validateLessonForm', () => {
  it('accepts valid values and trims them', () => {
    const result = validateLessonForm(
      { ...valid, title: '  Kruženje vode  ', content: '\n Voda isparava. \n' },
      subjectIds,
    );
    expect(result).toEqual({
      ok: true,
      data: { title: 'Kruženje vode', subjectId: 'priroda', grade: 4, content: 'Voda isparava.' },
    });
  });

  it('reports every missing field', () => {
    const result = validateLessonForm(
      { title: '', subjectId: '', grade: '', content: '' },
      subjectIds,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(['content', 'grade', 'subjectId', 'title']);
  });

  it('treats whitespace-only text as empty', () => {
    const result = validateLessonForm({ ...valid, title: '   ', content: ' \n ' }, subjectIds);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveProperty('title');
    expect(result.errors).toHaveProperty('content');
    expect(result.errors).not.toHaveProperty('subjectId');
  });

  it('rejects an unknown subject', () => {
    expect(validateLessonForm({ ...valid, subjectId: 'hemija' }, subjectIds).ok).toBe(false);
  });

  it.each(['0', '10', 'abc', '4.5'])('rejects grade %s', (grade) => {
    expect(validateLessonForm({ ...valid, grade }, subjectIds).ok).toBe(false);
  });
});

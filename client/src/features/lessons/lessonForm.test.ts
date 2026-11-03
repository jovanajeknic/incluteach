import { describe, expect, it } from 'vitest';
import { validateLessonForm, type LessonFormValues } from './lessonForm';

const valid: LessonFormValues = {
  title: 'Kruženje vode',
  subject: 'Priroda i društvo',
  grade: '4',
  content: 'Voda isparava.',
};

describe('validateLessonForm', () => {
  it('accepts valid values and trims them', () => {
    const result = validateLessonForm({
      ...valid,
      title: '  Kruženje vode  ',
      content: '\n Voda isparava. \n',
    });
    expect(result).toEqual({
      ok: true,
      data: {
        title: 'Kruženje vode',
        subject: 'Priroda i društvo',
        grade: 4,
        content: 'Voda isparava.',
      },
    });
  });

  it('reports every missing field', () => {
    const result = validateLessonForm({ title: '', subject: '', grade: '', content: '' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(['content', 'grade', 'subject', 'title']);
  });

  it('treats whitespace-only text as empty', () => {
    const result = validateLessonForm({ ...valid, title: '   ', subject: '\t', content: ' \n ' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveProperty('title');
    expect(result.errors).toHaveProperty('subject');
    expect(result.errors).toHaveProperty('content');
    expect(result.errors).not.toHaveProperty('grade');
  });

  it.each(['0', '10', 'abc', '4.5'])('rejects grade %s', (grade) => {
    const result = validateLessonForm({ ...valid, grade });
    expect(result.ok).toBe(false);
  });
});

import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { testLessons } from '@/test/lessonFixtures';
import { renderApp } from '@/test/renderApp';

describe('LessonDetailPage', () => {
  it('shows an existing lesson', () => {
    renderApp({ path: '/teacher/lessons/test-1', lessons: testLessons });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Test lekcija jedan' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Za pregled')).toBeInTheDocument();
    expect(screen.getByText('Prvi pasus.')).toBeInTheDocument();
    // The "saved" message belongs only to a freshly created draft.
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('explains when the lesson does not exist', async () => {
    const { user, router } = renderApp({
      path: '/teacher/lessons/does-not-exist',
      lessons: testLessons,
    });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Lekcija nije pronađena' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Nazad na lekcije' }));
    expect(router.state.location.pathname).toBe('/teacher');
  });
});

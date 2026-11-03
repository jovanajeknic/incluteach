import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { schoolWithLessons, testLessons } from '@/test/lessonFixtures';
import { renderApp } from '@/test/renderApp';

describe('LessonDetailPage', () => {
  it('shows an existing lesson with its versions', () => {
    renderApp({ path: '/teacher/lessons/test-1', school: schoolWithLessons(testLessons) });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Test lekcija jedan' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Vaš tekst' })).toHaveTextContent('Prvi pasus.');
    expect(screen.getByRole('article', { name: 'Kraća i jednostavnija' })).toHaveTextContent(
      'AI prijedlog — čeka odobrenje',
    );
    // The "saved" message belongs only to a freshly created draft.
    expect(screen.queryByText(/Nacrt je sačuvan/)).not.toBeInTheDocument();
  });

  it('explains when the lesson does not exist', async () => {
    const { user, router } = renderApp({
      path: '/teacher/lessons/does-not-exist',
      school: schoolWithLessons(testLessons),
    });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Lekcija nije pronađena' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Nazad na lekcije' }));
    expect(router.state.location.pathname).toBe('/teacher');
  });
});

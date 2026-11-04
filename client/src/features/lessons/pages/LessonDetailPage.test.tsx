import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { schoolWithLessons, testLessons } from '@/test/lessonFixtures';
import { renderApp } from '@/test/renderApp';

describe('LessonDetailPage', () => {
  it('shows a lesson waiting for review with its versions on tabs', async () => {
    const { user } = renderApp({
      path: '/teacher/lessons/test-1',
      school: schoolWithLessons(testLessons),
    });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Test lekcija jedan' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Tekst: shortened.');
    // Class 4-1: one student reads the shortened version.
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Dobija 1 učenik');

    await user.click(screen.getByRole('tab', { name: /Original/ }));
    expect(screen.getByRole('article', { name: 'Original' })).toHaveTextContent('Prvi pasus.');

    await user.click(screen.getByRole('tab', { name: /Ilustracije/ }));
    expect(within(screen.getByRole('tabpanel')).getByRole('img', { name: 'Knjiga' })).toBeVisible();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Vide ih svi učenici odjeljenja.');
  });

  it('offers to start the AI for a lesson that only has the teacher text', () => {
    renderApp({ path: '/teacher/lessons/test-3', school: schoolWithLessons(testLessons) });

    expect(screen.getByText('AI još nije pripremio verzije')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pokreni AI' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('shows a published lesson as published', () => {
    renderApp({ path: '/teacher/lessons/test-2', school: schoolWithLessons(testLessons) });

    expect(screen.getByText(/Objavljeno\. Učenici odjeljenja 4-2 je vide/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Objavi učenicima' })).not.toBeInTheDocument();
  });

  it('explains when the lesson does not exist', async () => {
    const { user, router } = renderApp({
      path: '/teacher/lessons/does-not-exist',
      school: schoolWithLessons(testLessons),
    });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Lekcija nije pronađena' }),
    ).toBeInTheDocument();

    await user.click(within(screen.getByRole('main')).getByRole('link', { name: 'Moji predmeti' }));
    expect(router.state.location.pathname).toBe('/teacher');
  });
});

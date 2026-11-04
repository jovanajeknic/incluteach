import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { schoolWithLessons, testLessons } from '@/test/lessonFixtures';
import { renderApp } from '@/test/renderApp';

describe('Teacher home: my subjects', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows each subject with the classes it is taught in, and no greeting or stats', () => {
    renderApp({ school: schoolWithLessons(testLessons) });

    expect(screen.getByRole('heading', { level: 1, name: 'Moji predmeti' })).toBeInTheDocument();
    expect(screen.queryByText(/Dobro došli|Ukupno lekcija/)).not.toBeInTheDocument();

    // Mathematics is taught in two classes, so its card links to both.
    const maths = screen.getByRole('heading', { level: 3, name: 'Matematika' }).closest('li')!;
    const links = within(maths).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'Odjeljenje 4-21 lekcija',
      'Odjeljenje 4-11 lekcija',
    ]);
    expect(screen.getByRole('heading', { level: 3, name: 'Likovna kultura' })).toBeInTheDocument();
  });

  it('switches to a view by class and remembers the choice', async () => {
    const { user, unmount } = renderApp({ school: schoolWithLessons(testLessons) });

    await user.click(screen.getByRole('button', { name: 'Po odjeljenjima' }));
    expect(screen.getByRole('button', { name: 'Po odjeljenjima' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const class41 = screen.getByRole('region', { name: 'Odjeljenje 4-1' });
    expect(within(class41).getAllByRole('heading', { level: 3 })).toHaveLength(1);
    expect(within(class41).getByRole('link')).toHaveAccessibleName(/Matematika · 4-1/);
    const class42 = screen.getByRole('region', { name: 'Odjeljenje 4-2' });
    expect(within(class42).getAllByRole('heading', { level: 3 })).toHaveLength(5);

    unmount();
    renderApp({ school: schoolWithLessons(testLessons) });
    expect(screen.getByRole('button', { name: 'Po odjeljenjima' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('lists lessons waiting for review in one quiet line', () => {
    renderApp({ school: schoolWithLessons(testLessons) });

    const review = screen.getByRole('region', { name: /Čeka tvoj pregled/ });
    expect(
      within(review)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Test lekcija jedan']);
  });

  it('hides the review line when nothing waits', () => {
    renderApp({ school: schoolWithLessons([testLessons[1]!]) });
    expect(screen.queryByRole('region', { name: /Čeka tvoj pregled/ })).not.toBeInTheDocument();
  });

  it('opens a subject in a class with its lessons and a status filter', async () => {
    const { user, router } = renderApp({ school: schoolWithLessons(testLessons) });

    const maths = screen.getByRole('heading', { level: 3, name: 'Matematika' }).closest('li')!;
    await user.click(within(maths).getByRole('link', { name: /Odjeljenje 4-2/ }));
    expect(router.state.location.pathname).toBe('/teacher/subjects/matematika/classes/4-2');
    expect(screen.getByRole('heading', { level: 1, name: 'Matematika' })).toBeInTheDocument();
    expect(screen.getByText(/Odjeljenje 4-2 · 6 učenika/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '4-1' })).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Test lekcija tri/ })).toHaveTextContent('Nacrt');
    await user.click(screen.getByRole('button', { name: /Objavljene/ }));
    expect(screen.getByText('Nijedna lekcija ne odgovara ovom prikazu.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /U izradi/ }));
    expect(screen.getByRole('link', { name: /Test lekcija tri/ })).toBeInTheDocument();
  });

  it('refuses a subject the teacher does not teach in that class', () => {
    renderApp({ path: '/teacher/subjects/priroda/classes/4-1' });
    expect(
      screen.getByRole('heading', { level: 1, name: 'Predmet nije pronađen' }),
    ).toBeInTheDocument();
  });

  it('labels the demo profile clearly', () => {
    renderApp({ school: schoolWithLessons(testLessons) });
    expect(screen.getByText('Demo profil')).toBeInTheDocument();
    expect(screen.getByText(/Demo verzija sa izmišljenim podacima/)).toBeInTheDocument();
  });
});

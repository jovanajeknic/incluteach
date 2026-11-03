import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { testLessons } from '@/test/lessonFixtures';
import { renderApp } from '@/test/renderApp';

describe('TeacherDashboardPage', () => {
  it('shows stats computed from the lesson data', () => {
    renderApp({ lessons: testLessons });

    const stats = screen.getByRole('region', { name: 'Pregled lekcija' });
    const valueFor = (label: string) => within(stats).getByText(label).nextElementSibling;
    expect(valueFor('Ukupno lekcija')).toHaveTextContent('3');
    expect(valueFor('Za pregled')).toHaveTextContent('1');
    expect(valueFor('Dodijeljene')).toHaveTextContent('1');
  });

  it('lists lessons with subject, grade and status text', () => {
    renderApp({ lessons: testLessons });

    const list = within(screen.getByRole('region', { name: 'Lekcije' })).getByRole('list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Test lekcija jedan');
    expect(items[0]).toHaveTextContent('Matematika · 2. razred');
    expect(items[0]).toHaveTextContent('Za pregled');
  });

  it('shows an empty state when there are no lessons', () => {
    renderApp({ lessons: [] });

    expect(screen.getByText('Još nemate lekcija')).toBeInTheDocument();
    const region = screen.getByRole('region', { name: 'Lekcije' });
    expect(within(region).getByRole('link', { name: 'Nova lekcija' })).toBeInTheDocument();
  });

  it('labels the demo profile clearly', () => {
    renderApp({ lessons: testLessons });
    expect(screen.getByText('Demo profil')).toBeInTheDocument();
    expect(screen.getByText(/Demo verzija sa izmišljenim podacima/)).toBeInTheDocument();
  });
});

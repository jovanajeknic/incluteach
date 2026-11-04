import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { schoolWithLessons, testLessons } from '@/test/lessonFixtures';
import { renderApp } from '@/test/renderApp';

describe('Adding a lesson', () => {
  it('saves the text, starts the AI at once and shows every version for review', async () => {
    const { user, router } = renderApp({
      path: '/teacher',
      school: schoolWithLessons(testLessons),
      aiDelayMs: 300,
    });

    await user.click(within(screen.getByRole('main')).getByRole('link', { name: 'Dodaj lekciju' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Dodaj lekciju' })).toBeInTheDocument();

    // Only subjects the teacher teaches, each in its class.
    const courses = screen.getByRole('group', { name: 'Predmet i odjeljenje' });
    expect(within(courses).getAllByRole('radio')).toHaveLength(6);
    await user.click(within(courses).getByRole('radio', { name: /Priroda i društvo.*4-2/ }));
    await user.type(screen.getByLabelText('Naslov'), '  Planete Sunčevog sistema  ');
    await user.type(
      screen.getByLabelText('Tekst lekcije'),
      'Sunce je zvijezda.{Enter}{Enter}Oko Sunca kruži osam planeta.',
    );
    await user.click(screen.getByRole('button', { name: 'Dodaj i pokreni AI' }));

    expect(router.state.location.pathname).toMatch(/^\/teacher\/lessons\/lesson-/);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Planete Sunčevog sistema' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('AI priprema verzije…')).toBeInTheDocument();

    const tabs = await screen.findByRole('tablist', { name: 'Verzije lekcije' });
    expect(
      within(tabs)
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual([
      'Original',
      'Skraćena, AI prijedlog',
      'Niži nivo, AI prijedlog',
      'Lakše čitanje, AI prijedlog',
      'Audio, AI prijedlog',
      'Ilustracije, AI prijedlog',
      'Kviz i riječi, AI prijedlog',
    ]);
    // Opens on the first version waiting for review.
    expect(within(tabs).getByRole('tab', { name: /Skraćena/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByText('Odobreno 0 od 6')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Priroda i društvo · 4-2' }));
    expect(screen.getByRole('link', { name: /Planete Sunčevog sistema/ })).toHaveTextContent(
      'Čeka pregled',
    );
  });

  it('preselects the subject and class when opened from a subject page', async () => {
    const { user } = renderApp({ path: '/teacher/subjects/matematika/classes/4-1' });

    await user.click(within(screen.getByRole('main')).getByRole('link', { name: 'Dodaj lekciju' }));
    expect(screen.getByRole('radio', { name: /Matematika.*4-1/ })).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Odustani' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Matematika' })).toBeInTheDocument();
  });

  it('does not save an empty form and moves focus to the first invalid field', async () => {
    const { user, router } = renderApp({ path: '/teacher/lessons/new' });

    await user.click(screen.getByRole('button', { name: 'Dodaj i pokreni AI' }));

    expect(router.state.location.pathname).toBe('/teacher/lessons/new');
    expect(screen.getByText('Izaberi predmet i odjeljenje.')).toBeInTheDocument();
    expect(screen.getByText('Unesi naslov lekcije.')).toBeInTheDocument();
    expect(screen.getByText('Unesi tekst lekcije.')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')[0]).toHaveFocus();

    const title = screen.getByLabelText('Naslov');
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(title).toHaveAccessibleDescription('Unesi naslov lekcije.');
  });

  it('rejects fields that contain only spaces and clears errors once corrected', async () => {
    const { user, router } = renderApp({ path: '/teacher/lessons/new' });

    await user.click(screen.getByRole('radio', { name: /Matematika.*4-2/ }));
    await user.type(screen.getByLabelText('Naslov'), '     ');
    await user.type(screen.getByLabelText('Tekst lekcije'), '   ');
    await user.click(screen.getByRole('button', { name: 'Dodaj i pokreni AI' }));

    expect(router.state.location.pathname).toBe('/teacher/lessons/new');
    expect(screen.getByText('Unesi naslov lekcije.')).toBeInTheDocument();
    expect(screen.queryByText('Izaberi predmet i odjeljenje.')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Naslov'), 'Novi naslov');
    expect(screen.queryByText('Unesi naslov lekcije.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Naslov')).toHaveAttribute('aria-invalid', 'false');
  });
});

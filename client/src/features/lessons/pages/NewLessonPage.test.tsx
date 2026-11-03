import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { schoolWithLessons, testLessons } from '@/test/lessonFixtures';
import { renderApp } from '@/test/renderApp';

function totalLessonsCount() {
  const term = screen.getByText('Ukupno lekcija');
  return term.nextElementSibling?.textContent;
}

describe('Creating a lesson draft', () => {
  it('saves a draft, opens its detail view and adds it to the list', async () => {
    const { user, router } = renderApp({
      path: '/teacher',
      school: schoolWithLessons(testLessons),
    });
    expect(totalLessonsCount()).toBe('3');

    await user.click(
      within(screen.getByRole('navigation')).getByRole('link', { name: 'Nova lekcija' }),
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Nova lekcija' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Naslov'), '  Planete Sunčevog sistema  ');
    await user.selectOptions(screen.getByLabelText('Predmet'), 'Priroda i društvo');
    await user.selectOptions(screen.getByLabelText('Razred'), '5. razred');
    await user.type(
      screen.getByLabelText('Tekst lekcije'),
      'Sunce je zvijezda.{Enter}{Enter}Oko Sunca kruži osam planeta.',
    );
    await user.click(screen.getByRole('button', { name: 'Sačuvaj nacrt' }));

    expect(router.state.location.pathname).toMatch(/^\/teacher\/lessons\/lesson-/);
    expect(screen.getByText(/Sljedeći korak je prilagođavanje/)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Planete Sunčevog sistema' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Priroda i društvo')).toBeInTheDocument();
    expect(screen.getByText('5. razred')).toBeInTheDocument();
    expect(screen.getAllByText('Nacrt').length).toBeGreaterThan(0);
    // Blank line splits the text into two paragraphs.
    const firstParagraph = screen.getByText('Sunce je zvijezda.').closest('p');
    const secondParagraph = screen.getByText('Oko Sunca kruži osam planeta.').closest('p');
    expect(firstParagraph).not.toBeNull();
    expect(secondParagraph).not.toBeNull();
    expect(firstParagraph).not.toBe(secondParagraph);

    await user.click(screen.getByRole('link', { name: 'Sve lekcije' }));
    expect(totalLessonsCount()).toBe('4');
    expect(screen.getByRole('link', { name: 'Planete Sunčevog sistema' })).toBeInTheDocument();
  });

  it('does not save an empty form and moves focus to the first invalid field', async () => {
    const { user, router } = renderApp({
      path: '/teacher/lessons/new',
      school: schoolWithLessons(testLessons),
    });

    await user.click(screen.getByRole('button', { name: 'Sačuvaj nacrt' }));

    expect(router.state.location.pathname).toBe('/teacher/lessons/new');
    expect(screen.getByText('Unesite naslov lekcije.')).toBeInTheDocument();
    expect(screen.getByText('Izaberite predmet.')).toBeInTheDocument();
    expect(screen.getByText('Izaberite razred.')).toBeInTheDocument();
    expect(screen.getByText('Unesite tekst lekcije.')).toBeInTheDocument();

    const title = screen.getByLabelText('Naslov');
    expect(title).toHaveFocus();
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(title).toHaveAccessibleDescription('Unesite naslov lekcije.');
  });

  it('rejects fields that contain only spaces', async () => {
    const { user, router } = renderApp({
      path: '/teacher/lessons/new',
      school: schoolWithLessons(testLessons),
    });

    await user.type(screen.getByLabelText('Naslov'), '     ');
    await user.selectOptions(screen.getByLabelText('Predmet'), 'Matematika');
    await user.selectOptions(screen.getByLabelText('Razred'), '2. razred');
    await user.type(screen.getByLabelText('Tekst lekcije'), '   ');
    await user.click(screen.getByRole('button', { name: 'Sačuvaj nacrt' }));

    expect(router.state.location.pathname).toBe('/teacher/lessons/new');
    expect(screen.getByText('Unesite naslov lekcije.')).toBeInTheDocument();
    expect(screen.getByText('Unesite tekst lekcije.')).toBeInTheDocument();
    expect(screen.queryByText('Izaberite predmet.')).not.toBeInTheDocument();

    // Nothing was added to the lesson list.
    await user.click(screen.getByRole('button', { name: 'Odustani' }));
    expect(router.state.location.pathname).toBe('/teacher');
    expect(totalLessonsCount()).toBe('3');
  });

  it('clears an error once the field is corrected', async () => {
    const { user } = renderApp({
      path: '/teacher/lessons/new',
      school: schoolWithLessons(testLessons),
    });

    await user.click(screen.getByRole('button', { name: 'Sačuvaj nacrt' }));
    expect(screen.getByText('Unesite naslov lekcije.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Naslov'), 'Novi naslov');
    expect(screen.queryByText('Unesite naslov lekcije.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Naslov')).toHaveAttribute('aria-invalid', 'false');
  });
});

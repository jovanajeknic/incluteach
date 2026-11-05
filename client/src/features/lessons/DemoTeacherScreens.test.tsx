import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { demoSchoolData } from '@/features/school/demoSchoolData';
import { schoolWithLessons, testLessons } from '@/test/lessonFixtures';
import { renderApp } from '@/test/renderApp';

// The teacher's lesson screens now talk to the real API (see the lessons and subjects tests).
// What is left here covers the demo screens that still use the in-memory school.

describe('Lesson visibility', () => {
  it('does not show an unpublished lesson to students', () => {
    renderApp({ path: '/student/lessons/saobracaj' });
    expect(
      screen.getByRole('heading', { level: 1, name: 'Lekcija nije pronađena' }),
    ).toBeInTheDocument();
  });
});

describe('Students and parent suggestions', () => {
  it('shows each class with lessons done, quizzes and stars, and no diagnoses', async () => {
    const { user } = renderApp({ path: '/teacher/class' });

    expect(screen.getByRole('heading', { level: 1, name: 'Učenici' })).toBeInTheDocument();
    const mia = screen.getByRole('row', { name: /Mia Petrović/ });
    const cells = within(mia).getAllByRole('cell');
    expect(cells[0]).toHaveTextContent('1 od 6');
    expect(cells[1]).toHaveTextContent('1 od 6');
    // A lesson marked as done and its quiz: two stars.
    expect(cells[2]).toHaveTextContent('2 zvjezdice');
    expect(document.body.textContent?.toLowerCase()).not.toMatch(/disleksij|adhd|poremećaj/);

    await user.click(screen.getByRole('button', { name: 'Odjeljenje 4-1' }));
    expect(screen.getByRole('row', { name: /Ema Kovačević/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /Mia Petrović/ })).not.toBeInTheDocument();
  });

  it('changes which version a student receives, which changes what they read', async () => {
    const { user, goAs } = renderApp({ path: '/teacher/students/demo-student-luka' });

    expect(screen.getByRole('radio', { name: 'Niži nivo' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Dobija i audio zapis' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Original' }));
    await user.click(screen.getByRole('button', { name: 'Sačuvaj' }));
    expect(screen.getByText(/Sačuvano\. Važi od sljedećeg otvaranja lekcije/)).toBeInTheDocument();

    await goAs('student', '/student/lessons/kruzenje-vode');
    expect(screen.getByText(/Voda u prirodi stalno putuje\./)).toBeInTheDocument();
    expect(screen.queryByText('Sunce grije vodu.')).not.toBeInTheDocument();
  });

  it("refuses a student outside the teacher's classes", () => {
    renderApp({ path: '/teacher/students/someone-else' });
    expect(screen.getByRole('heading', { level: 1, name: 'Nemate pristup' })).toBeInTheDocument();
  });

  it("turns a parent suggestion into the teacher's own instruction", async () => {
    const { user, goAs } = renderApp({ path: '/teacher/suggestions' });

    expect(screen.getByRole('link', { name: /Prijedlozi roditelja/ })).toHaveTextContent('1');
    expect(screen.getByText(/uz tekst ima sliku ili crtež/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Napiši uputstvo za AI' }));
    await user.click(screen.getByRole('button', { name: 'Sačuvaj uputstvo' }));
    expect(screen.getByText('Napiši uputstvo prije čuvanja.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Uputstvo za AI'), 'Više slika uz tekst');
    await user.click(screen.getByRole('button', { name: 'Sačuvaj uputstvo' }));

    // "New" filter: the handled suggestion leaves the list.
    expect(screen.getByText('Nema prijedloga za prikaz.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Svi' }));
    expect(screen.getByText('Nastavnik ga uzima u obzir pri prilagođavanju')).toBeInTheDocument();
    expect(screen.getByText('Uputstvo za AI: „Više slika uz tekst“')).toBeInTheDocument();

    await goAs('parent', '/parent/children/demo-student-luka');
    expect(screen.getByText('Nastavnik ga uzima u obzir pri prilagođavanju')).toBeInTheDocument();
    // The parent sees the status, not the teacher's instruction.
    expect(screen.queryByText(/Više slika uz tekst/)).not.toBeInTheDocument();
  });

  it('shows a teacher only the suggestions for their subjects, or general ones as class teacher', () => {
    const school = {
      ...demoSchoolData,
      suggestions: [
        // General, for a child in 4-1, where Ana is not the class teacher.
        {
          id: 's1',
          childId: 'demo-student-ema',
          text: 'Opšti za Emu.',
          createdAt: '2026-11-03T10:00:00.000Z',
          status: 'pending-teacher' as const,
        },
        // About Ana's own mathematics lesson in 4-1.
        {
          id: 's2',
          childId: 'demo-student-ema',
          lessonId: 'mnozenje',
          text: 'O množenju.',
          createdAt: '2026-11-03T10:00:00.000Z',
          status: 'pending-teacher' as const,
        },
        // General, for a child in 4-2, where Ana is the class teacher.
        {
          id: 's3',
          childId: 'demo-student-mia',
          text: 'Opšti za Miu.',
          createdAt: '2026-11-03T10:00:00.000Z',
          status: 'pending-teacher' as const,
        },
      ],
    };
    renderApp({ path: '/teacher/suggestions', school });

    expect(screen.queryByText('Opšti za Emu.')).not.toBeInTheDocument();
    expect(screen.getByText('O množenju.')).toBeInTheDocument();
    expect(screen.getByText('Opšti za Miu.')).toBeInTheDocument();
  });
});

describe('Class teacher and subject teachers', () => {
  it('lets only the class teacher change the version profile', () => {
    renderApp({ path: '/teacher/students/demo-student-ema' });

    expect(screen.getByText(/mijenja razredni starešina/)).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sačuvaj' })).not.toBeInTheDocument();
  });

  it('shows a subject teacher only the progress in their own subjects', () => {
    const nature41 = {
      ...testLessons[1]!,
      id: 'priroda-4-1',
      title: 'Tuđa lekcija prirode',
      classId: '4-1',
    };
    const school = schoolWithLessons([...demoSchoolData.lessons, nature41]);
    renderApp({ path: '/teacher/students/demo-student-ema', school });

    expect(screen.getByRole('link', { name: 'Množenje kao sabiranje' })).toBeInTheDocument();
    expect(screen.queryByText('Tuđa lekcija prirode')).not.toBeInTheDocument();
  });
});

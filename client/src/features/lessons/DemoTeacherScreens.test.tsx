import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { demoSchoolData } from '@/features/school/demoSchoolData';
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

describe('Parent suggestions', () => {
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

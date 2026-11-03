import { act, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/renderApp';

const DRAFT = '/teacher/lessons/saobracaj';

describe('Lesson workflow', () => {
  it('lists the versions the class needs, by count only', () => {
    renderApp({ path: DRAFT });
    const panel = screen.getByRole('region', { name: 'AI prilagođavanje' });

    // Demo class: two students need shorter text, one needs more examples.
    expect(panel).toHaveTextContent('Kraća i jednostavnija verzija — za 2 učenika');
    expect(panel).toHaveTextContent('Verzija sa više primjera — za 1 učenika');
    expect(panel).toHaveTextContent(/AI je simuliran/);
  });

  it('adapts, reviews, approves and assigns a lesson that then reaches the student', async () => {
    const { user, router } = renderApp({ path: DRAFT, aiDelayMs: 300 });

    await user.click(screen.getByRole('button', { name: 'Prilagodi pomoću AI' }));
    expect(await screen.findByText('AI priprema prilagođene verzije…')).toBeInTheDocument();
    expect(await screen.findByText('AI prijedlozi su spremni za pregled.')).toBeInTheDocument();

    const simplified = screen.getByRole('article', { name: 'Kraća i jednostavnija' });
    expect(simplified).toHaveTextContent('AI prijedlog — čeka odobrenje');
    expect(screen.getByRole('article', { name: 'Sa više primjera' })).toBeInTheDocument();

    // Edit the AI suggestion before approving it.
    await user.click(within(simplified).getByRole('button', { name: /Uredi/ }));
    const editor = within(simplified).getByLabelText('Tekst verzije: Kraća i jednostavnija');
    await user.clear(editor);
    await user.type(editor, 'Prelazi ulicu na zebri.');
    await user.click(within(simplified).getByRole('button', { name: 'Sačuvaj' }));
    expect(screen.getByRole('article', { name: 'Kraća i jednostavnija' })).toHaveTextContent(
      'Prelazi ulicu na zebri.',
    );

    // Assigning is not possible before approval.
    expect(screen.getByText('Lekciju možete dodijeliti tek kad je odobrite.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Odobri lekciju' }));
    await user.click(screen.getByRole('button', { name: 'Da, odobri' }));
    expect(screen.getByText('Lekcija je odobrena.')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Kraća i jednostavnija' })).toHaveTextContent(
      'Odobreno',
    );

    await user.click(screen.getByRole('checkbox', { name: 'Cijeli razred 4-2' }));
    await user.click(screen.getByRole('button', { name: 'Dodijeli' }));
    expect(screen.getByText(/Lekcija je dodijeljena/)).toBeInTheDocument();

    // The demo student needs shorter text, so they get the edited, approved version.
    await act(() => router.navigate('/student/lessons/saobracaj'));
    expect(
      screen.getByRole('heading', { level: 1, name: 'Bezbjednost u saobraćaju' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Kraća verzija')).toBeInTheDocument();
    expect(screen.getByText('Prelazi ulicu na zebri.')).toBeInTheDocument();
  });

  it('does not show an unassigned lesson to students', () => {
    renderApp({ path: '/student/lessons/saobracaj' });
    expect(
      screen.getByRole('heading', { level: 1, name: 'Lekcija nije pronađena' }),
    ).toBeInTheDocument();
  });

  it('requires a choice before assigning', async () => {
    const { user } = renderApp({ path: '/teacher/lessons/godisnja-doba' });

    await user.click(screen.getByRole('button', { name: 'Dodijeli' }));
    expect(screen.getByText('Izaberite razred ili bar jednog učenika.')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Mia Petrović' }));
    await user.click(screen.getByRole('button', { name: 'Dodijeli' }));
    expect(screen.getByText(/Trenutno dodijeljeno:/).parentElement).toHaveTextContent(
      'Mia Petrović',
    );
  });

  it('edits glossary and practice questions, rejecting incomplete rows', async () => {
    const { user } = renderApp({ path: DRAFT });
    const glossary = screen.getByRole('region', { name: 'Objašnjenja težih riječi' });

    await user.click(within(glossary).getByRole('button', { name: 'Dodaj riječ' }));
    await user.click(within(glossary).getByRole('button', { name: 'Sačuvaj izmjene' }));
    expect(glossary).toHaveTextContent('Popunite sva polja ili uklonite prazne redove.');

    await user.type(within(glossary).getByLabelText('Riječ 1'), 'semafor');
    await user.type(
      within(glossary).getByLabelText('Objašnjenje 1'),
      'Svjetla koja kažu kada se ide.',
    );
    await user.click(within(glossary).getByRole('button', { name: 'Sačuvaj izmjene' }));
    expect(screen.getByRole('region', { name: 'Objašnjenja težih riječi' })).toHaveTextContent(
      'Izmjene su sačuvane.',
    );

    const quiz = screen.getByRole('region', { name: 'Pitanja za vježbu' });
    await user.click(within(quiz).getByRole('button', { name: 'Dodaj pitanje' }));
    await user.type(within(quiz).getByLabelText('Pitanje 1'), 'Gdje prelazimo ulicu?');
    await user.type(within(quiz).getByLabelText('Pitanje 1, odgovor 1'), 'Na zebri');
    await user.type(within(quiz).getByLabelText('Pitanje 1, odgovor 2'), 'Bilo gdje');
    await user.type(within(quiz).getByLabelText('Pitanje 1, odgovor 3'), 'Na krovu');
    await user.type(
      within(quiz).getByLabelText('Objašnjenje za pitanje 1'),
      'Na pješačkom prelazu.',
    );
    await user.click(within(quiz).getByRole('button', { name: 'Sačuvaj izmjene' }));
    expect(screen.getByRole('region', { name: 'Pitanja za vježbu' })).toHaveTextContent(
      'Izmjene su sačuvane.',
    );
  });
});

describe('Class, students and parent suggestions', () => {
  it('shows the class with needs (never diagnoses) and progress', () => {
    renderApp({ path: '/teacher/class' });

    expect(screen.getByRole('heading', { level: 1, name: 'Razred 4-2' })).toBeInTheDocument();
    const sara = screen.getByRole('link', { name: /Sara Đukić/ });
    expect(sara).toHaveTextContent('Više primjera');
    expect(sara).toHaveTextContent('Završene vježbe: 1 od');
    expect(screen.getByRole('link', { name: /Lena Popović/ })).toHaveTextContent(
      'Bez posebnih potreba',
    );
    // Needs are shown; diagnosis terms never are.
    expect(document.body.textContent?.toLowerCase()).not.toMatch(/disleksij|adhd|poremećaj/);
  });

  it("changes a student's needs, which changes the lesson version they see", async () => {
    const { user, router } = renderApp({ path: '/teacher/students/demo-student-luka' });

    await user.click(screen.getByRole('checkbox', { name: 'Kraći i jednostavniji tekst' }));
    await user.click(screen.getByRole('button', { name: 'Sačuvaj potrebe' }));
    expect(screen.getByText(/Potrebe su sačuvane/)).toBeInTheDocument();

    await act(() => router.navigate('/student/lessons/kruzenje-vode'));
    expect(screen.queryByText('Kraća verzija')).not.toBeInTheDocument();
  });

  it("refuses a student outside the teacher's class", () => {
    renderApp({ path: '/teacher/students/someone-else' });
    expect(screen.getByRole('heading', { level: 1, name: 'Nemate pristup' })).toBeInTheDocument();
  });

  it('passes a parent suggestion to the AI and shows the new status to the parent', async () => {
    const { user, router } = renderApp({ path: '/teacher/suggestions' });

    expect(screen.getByRole('link', { name: /Prijedlozi roditelja/ })).toHaveTextContent('1');
    expect(screen.getByText(/uz tekst ima sliku ili crtež/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Koristi pri prilagođavanju' }));

    // "New" filter: the handled suggestion leaves the list.
    expect(screen.getByText('Nema prijedloga za prikaz.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Svi' }));
    expect(screen.getByText('Nastavnik ga koristi pri prilagođavanju')).toBeInTheDocument();

    await act(() => router.navigate('/teacher/lessons/saobracaj'));
    expect(screen.getByRole('region', { name: 'AI prilagođavanje' })).toHaveTextContent(
      /Luka: Luka lakše prati lekciju/,
    );

    await act(() => router.navigate('/parent/children/demo-student-luka'));
    expect(screen.getByText('Nastavnik ga koristi pri prilagođavanju')).toBeInTheDocument();
  });
});

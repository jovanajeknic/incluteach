import { act, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { AiService } from '@/features/school/demoAiService';
import { demoSchoolData } from '@/features/school/demoSchoolData';
import { schoolWithLessons, testLessons } from '@/test/lessonFixtures';
import { renderApp } from '@/test/renderApp';

const DRAFT = '/teacher/lessons/saobracaj';

describe('Lesson workflow', () => {
  it('generates, reviews with feedback, approves and publishes a lesson to its class', async () => {
    const { user, router } = renderApp({ path: DRAFT, aiDelayMs: 300 });

    await user.click(screen.getByRole('button', { name: 'Pokreni AI' }));
    expect(await screen.findByText('AI priprema verzije…')).toBeInTheDocument();
    await screen.findByRole('tablist', { name: 'Verzije lekcije' });

    // Shortened: the class has one student for it. Ask the AI to redo it.
    const panel = () => screen.getByRole('tabpanel');
    expect(panel()).toHaveTextContent('Dobija 1 učenik');
    expect(panel()).toHaveTextContent('Ulicu prelazimo na pješačkom prelazu, kad je zeleno.');
    await user.click(within(panel()).getByRole('button', { name: 'Prepravi' }));
    expect(within(panel()).getByText('Napiši šta treba promijeniti.')).toBeInTheDocument();
    await user.type(within(panel()).getByLabelText('Šta da AI promijeni?'), 'Još kraće');
    await user.click(within(panel()).getByRole('button', { name: 'Prepravi' }));
    expect(await within(panel()).findByText('AI prepravlja ovu verziju…')).toBeInTheDocument();
    expect(
      await within(panel()).findByText(/prepravljeno prema napomeni „Još kraće“/),
    ).toBeInTheDocument();

    // Publishing waits until every version is approved.
    const publish = screen.getByRole('button', { name: 'Objavi učenicima' });
    expect(publish).toBeDisabled();
    await user.click(within(panel()).getByRole('button', { name: 'Odobri: Skraćena' }));
    expect(within(panel()).getByText('Odobreno')).toBeInTheDocument();
    expect(screen.getByText('Odobreno 1 od 6')).toBeInTheDocument();

    // Easier: the teacher edits the AI text by hand before approving.
    await user.click(screen.getByRole('tab', { name: /Niži nivo/ }));
    await user.click(within(panel()).getByRole('button', { name: 'Uredi tekst: Niži nivo' }));
    const editor = within(panel()).getByLabelText('Tekst: Niži nivo');
    await user.clear(editor);
    await user.type(editor, 'Prelazi ulicu na zebri.');
    await user.click(within(panel()).getByRole('button', { name: 'Sačuvaj' }));
    expect(within(panel()).getByRole('article', { name: 'Niži nivo' })).toHaveTextContent(
      'Prelazi ulicu na zebri.',
    );
    await user.click(within(panel()).getByRole('button', { name: 'Odobri: Niži nivo' }));

    for (const tab of ['Lakše čitanje', 'Audio', 'Ilustracije']) {
      await user.click(screen.getByRole('tab', { name: new RegExp(tab) }));
      await user.click(within(panel()).getByRole('button', { name: `Odobri: ${tab}` }));
    }
    expect(screen.getByRole('tab', { name: /Ilustracije, Odobreno/ })).toBeInTheDocument();

    // The quiz and word explanations also come from the AI: no publishing without a yes.
    expect(screen.getByRole('button', { name: 'Objavi učenicima' })).toBeDisabled();
    await user.click(screen.getByRole('tab', { name: /Kviz i riječi/ }));
    expect(within(panel()).getByDisplayValue('Gdje prelazimo ulicu?')).toBeInTheDocument();
    await user.click(within(panel()).getByRole('button', { name: 'Odobri kviz i riječi' }));
    expect(screen.getByText(/Sve je odobreno\. Lekcija ide odjeljenju 4-2/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Objavi učenicima' }));
    expect(screen.getByText(/Objavljeno\. Učenici odjeljenja 4-2 je vide/)).toBeInTheDocument();

    // Luka receives the easier version, so he reads the teacher's edited text.
    await act(() => router.navigate('/student/lessons/saobracaj'));
    expect(
      screen.getByRole('heading', { level: 1, name: 'Bezbjednost u saobraćaju' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Prelazi ulicu na zebri.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Pješački prelaz/ })).toBeInTheDocument();
  });

  it('does not show an unpublished lesson to students', () => {
    renderApp({ path: '/student/lessons/saobracaj' });
    expect(
      screen.getByRole('heading', { level: 1, name: 'Lekcija nije pronađena' }),
    ).toBeInTheDocument();
  });

  it('publishes a fully approved lesson and its new versions reach the right students', async () => {
    const { user, router } = renderApp({ path: '/teacher/lessons/godisnja-doba' });

    expect(screen.getByText('Odobreno 6 od 6')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Objavi učenicima' }));

    // Luka gets the easier text; Mia (shortened) sees hers through her parent.
    await act(() => router.navigate('/student/lessons/godisnja-doba'));
    expect(screen.getByText('Ljeti je toplo.')).toBeInTheDocument();
    await act(() => router.navigate('/parent/children/demo-student-mia/lessons/godisnja-doba'));
    expect(screen.getByText('Skraćena verzija')).toBeInTheDocument();
  });

  it('edits quiz questions and harder words, rejecting incomplete rows', async () => {
    const { user } = renderApp({ path: '/teacher/lessons/razlomci-uvod' });
    await user.click(screen.getByRole('tab', { name: /Kviz i riječi/ }));

    const glossary = screen.getByRole('region', { name: 'Teže riječi' });
    await user.click(within(glossary).getByRole('button', { name: '+ riječ' }));
    await user.click(within(glossary).getByRole('button', { name: 'Sačuvaj' }));
    expect(glossary).toHaveTextContent('Neki redovi su prazni — popuni ih ili ukloni.');

    await user.type(within(glossary).getByLabelText('Riječ 3'), 'brojilac');
    await user.type(within(glossary).getByLabelText('Objašnjenje 3'), 'Broj iznad crte.');
    await user.click(within(glossary).getByRole('button', { name: 'Sačuvaj' }));
    expect(screen.getByRole('region', { name: 'Teže riječi' })).toHaveTextContent('Sačuvano.');

    const quiz = screen.getByRole('region', { name: 'Pitanja za kviz' });
    await user.click(within(quiz).getByRole('button', { name: '+ pitanje' }));
    await user.type(within(quiz).getByLabelText('Pitanje 2'), 'Šta je polovina?');
    await user.type(within(quiz).getByLabelText('Pitanje 2, odgovor 1'), 'Jedan od dva dijela');
    await user.type(within(quiz).getByLabelText('Pitanje 2, odgovor 2'), 'Cijela pica');
    await user.type(within(quiz).getByLabelText('Pitanje 2, odgovor 3'), 'Ništa');
    await user.type(within(quiz).getByLabelText('Objašnjenje za pitanje 2'), 'Dva jednaka dijela.');
    await user.click(within(quiz).getByRole('button', { name: 'Sačuvaj' }));
    expect(screen.getByRole('region', { name: 'Pitanja za kviz' })).toHaveTextContent('Sačuvano.');
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
    const { user, router } = renderApp({ path: '/teacher/students/demo-student-luka' });

    expect(screen.getByRole('radio', { name: 'Niži nivo' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Dobija i audio zapis' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Original' }));
    await user.click(screen.getByRole('button', { name: 'Sačuvaj' }));
    expect(screen.getByText(/Sačuvano\. Važi od sljedećeg otvaranja lekcije/)).toBeInTheDocument();

    await act(() => router.navigate('/student/lessons/kruzenje-vode'));
    expect(screen.getByText(/Voda u prirodi stalno putuje\./)).toBeInTheDocument();
    expect(screen.queryByText('Sunce grije vodu.')).not.toBeInTheDocument();
  });

  it("refuses a student outside the teacher's classes", () => {
    renderApp({ path: '/teacher/students/someone-else' });
    expect(screen.getByRole('heading', { level: 1, name: 'Nemate pristup' })).toBeInTheDocument();
  });

  it('passes a parent suggestion to the AI and shows the new status to the parent', async () => {
    const { user, router } = renderApp({ path: '/teacher/suggestions' });

    expect(screen.getByRole('link', { name: /Prijedlozi roditelja/ })).toHaveTextContent('1');
    expect(screen.getByText(/uz tekst ima sliku ili crtež/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Proslijedi AI-u' }));

    // "New" filter: the handled suggestion leaves the list.
    expect(screen.getByText('Nema prijedloga za prikaz.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Svi' }));
    expect(screen.getByText('Nastavnik ga je proslijedio AI-u')).toBeInTheDocument();

    await act(() => router.navigate('/teacher/lessons/godisnja-doba'));
    await user.click(screen.getByRole('tab', { name: /Original/ }));
    expect(
      screen.getByRole('region', { name: 'AI uzima u obzir i prijedloge roditelja:' }),
    ).toHaveTextContent(/Luka: „Luka lakše prati lekciju/);

    await act(() => router.navigate('/parent/children/demo-student-luka'));
    expect(screen.getByText('Nastavnik ga je proslijedio AI-u')).toBeInTheDocument();
  });
});

describe('Published lessons change only when the teacher publishes again', () => {
  it('keeps what students see while the AI redoes every version', async () => {
    const { user, router } = renderApp({ path: '/teacher/lessons/kruzenje-vode' });

    await user.click(screen.getByRole('tab', { name: /Original/ }));
    await user.click(screen.getByRole('button', { name: 'Napravi sve verzije ponovo' }));
    expect(
      await screen.findByText(/Tvoje izmjene vide tek kad ih odobriš i objaviš/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Objavi izmjene' })).toBeDisabled();

    // Luka still reads the easier version that was published before.
    await act(() => router.navigate('/student/lessons/kruzenje-vode'));
    expect(screen.getByText('Sunce grije vodu.')).toBeInTheDocument();
  });

  it('sends edits to students only after "Objavi izmjene"', async () => {
    const { user } = renderApp({ path: '/teacher/lessons/mnozenje' });
    const panel = () => screen.getByRole('tabpanel');

    await user.click(screen.getByRole('tab', { name: /Niži nivo/ }));
    await user.click(within(panel()).getByRole('button', { name: 'Uredi tekst: Niži nivo' }));
    const editor = within(panel()).getByLabelText('Tekst: Niži nivo');
    await user.clear(editor);
    await user.type(editor, 'Četiri tanjira, po tri jabuke.');
    await user.click(within(panel()).getByRole('button', { name: 'Sačuvaj' }));
    expect(
      screen.getByText('Izmjene su odobrene. Objavi ih da ih učenici vide.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Objavi izmjene' }));
    expect(screen.getByText(/Objavljeno\. Učenici odjeljenja 4-1 je vide/)).toBeInTheDocument();
  });

  it('marks the versions as outdated when the teacher changes the original text', async () => {
    const { user } = renderApp({ path: '/teacher/lessons/godisnja-doba' });
    expect(screen.getByText('Odobreno 6 od 6')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Original/ }));
    await user.click(screen.getByRole('button', { name: 'Uredi tekst: Original' }));
    await user.type(screen.getByLabelText('Tekst: Original'), ' Svako doba traje tri mjeseca.');
    await user.click(screen.getByRole('button', { name: 'Sačuvaj' }));

    expect(screen.getByText('Odobreno 0 od 6')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Objavi učenicima' })).toBeDisabled();
    await user.click(screen.getByRole('tab', { name: /Skraćena/ }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent(/Tvoj tekst se promijenio/);
  });
});

describe('AI failures and access', () => {
  const failingAi: AiService = {
    generate: () => Promise.reject(new Error('AI unavailable')),
  };

  it('offers to try again when the AI fails, without losing the lesson', async () => {
    const { user } = renderApp({ path: '/teacher/lessons/saobracaj', aiService: failingAi });

    await user.click(screen.getByRole('button', { name: 'Pokreni AI' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('AI trenutno nije uspio');
    expect(
      screen.getAllByRole('button', { name: /Pokušaj ponovo|Pokreni AI/ }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/Ulicu prelazimo samo na pješačkom prelazu/)).toBeInTheDocument();
  });

  it('keeps the previous version when redoing one version fails', async () => {
    const { user } = renderApp({ path: '/teacher/lessons/razlomci-uvod', aiService: failingAi });
    const panel = () => screen.getByRole('tabpanel');

    await user.type(within(panel()).getByLabelText('Šta da AI promijeni?'), 'Kraće');
    await user.click(within(panel()).getByRole('button', { name: 'Prepravi' }));
    expect(await within(panel()).findByRole('alert')).toHaveTextContent('Prethodna je sačuvana.');
    expect(panel()).toHaveTextContent('Razlomak je dio cjeline.');
  });

  it('refuses a lesson of a subject the teacher does not teach in that class', () => {
    const foreign = { ...testLessons[0]!, id: 'tudja', subjectId: 'priroda', classId: '4-1' };
    renderApp({ path: '/teacher/lessons/tudja', school: schoolWithLessons([foreign]) });
    expect(screen.getByRole('heading', { level: 1, name: 'Nemate pristup' })).toBeInTheDocument();
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

import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/renderApp';
import type { SupportProfile } from './types';

const standardReader: Partial<SupportProfile> = { readingVersion: 'standard', audio: false };
/** The lesson has no dyslexia version yet, but the reading preset still follows the profile. */
const dyslexiaReader: Partial<SupportProfile> = { readingVersion: 'dyslexia' };

/** Finds a whole lesson sentence even when glossary words split it into several elements. */
function findSentence(match: string | RegExp): Element | undefined {
  return [...document.querySelectorAll('[data-sentence]')].find((element) => {
    const content = element.textContent ?? '';
    return typeof match === 'string' ? content === match : match.test(content);
  });
}

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

/** A fake local voice; returns the sentences it was asked to speak. */
function stubVoice(): string[] {
  const spoken: string[] = [];
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      text: string;
      voice: unknown = null;
      lang = '';
      rate = 1;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    },
  );
  const synth = {
    getVoices: () => [{ lang: 'sr-RS', name: 'Test glas' }],
    speak: vi.fn((utterance: { text: string; onstart: (() => void) | null }) => {
      spoken.push(utterance.text);
      utterance.onstart?.();
    }),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal('speechSynthesis', synth);
  return spoken;
}

describe('Student subjects and lessons', () => {
  it('lists the student subjects with lesson counts', () => {
    renderApp({ path: '/student' });

    expect(screen.getByRole('heading', { level: 1, name: 'Moji predmeti' })).toBeInTheDocument();
    expect(screen.getByText('Zdravo, Luka!')).toBeInTheDocument();
    const subjects = within(screen.getByRole('region', { name: 'Predmeti' })).getAllByRole('link');
    expect(subjects.map((link) => link.textContent)).toEqual([
      expect.stringContaining('Priroda i društvo'),
      expect.stringContaining('Matematika'),
      expect.stringContaining('Maternji jezik'),
      expect.stringContaining('Engleski jezik'),
      expect.stringContaining('Likovna kultura'),
    ]);
    expect(subjects[0]).toHaveTextContent('2 lekcije');
    // Luka has marked one of the two mathematics lessons as done.
    expect(subjects[1]).toHaveTextContent('pređeno 1 od 2');
    expect(subjects[4]).toHaveTextContent('Još nema lekcija');
  });

  it('opens a subject, then a lesson, and tracks progress', async () => {
    const { user, router } = renderApp({ path: '/student' });

    await user.click(screen.getByRole('link', { name: /Priroda i društvo/ }));
    expect(router.state.location.pathname).toBe('/student/subjects/priroda');
    const lessonLink = screen.getByRole('link', { name: /Kruženje vode u prirodi/ });
    expect(lessonLink).toHaveTextContent('Nova');

    await user.click(lessonLink);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Kruženje vode u prirodi' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Priroda i društvo' }));
    expect(screen.getByRole('link', { name: /Kruženje vode u prirodi/ })).toHaveTextContent(
      'Započeta',
    );
  });

  it('shows an empty state for a subject without lessons', () => {
    renderApp({ path: '/student/subjects/likovno' });
    expect(screen.getByText(/još nema lekcija/)).toBeInTheDocument();
  });

  it('explains when a subject or lesson does not exist', () => {
    renderApp({ path: '/student/lessons/ne-postoji' });
    expect(
      screen.getByRole('heading', { level: 1, name: 'Lekcija nije pronađena' }),
    ).toBeInTheDocument();
  });
});

describe('Adapted lesson versions', () => {
  it('shows the approved version named in the profile, without labelling it', () => {
    renderApp({ path: '/student/lessons/kruzenje-vode' });

    expect(screen.getByText('Sunce grije vodu.')).toBeInTheDocument();
    // Nothing on the page says this is a different version.
    expect(document.body.textContent).not.toMatch(/niži nivo|nižeg nivoa|skraćen|lakše čitanje/i);
  });

  it('shows the teacher text to a student whose profile names it', () => {
    renderApp({ path: '/student/lessons/kruzenje-vode', studentNeeds: standardReader });

    expect(screen.getByText(/Voda u prirodi stalno putuje\./)).toBeInTheDocument();
  });

  it('falls back to the teacher text while the named version is missing', () => {
    renderApp({
      path: '/student/lessons/kruzenje-vode',
      studentNeeds: { readingVersion: 'dyslexia' },
    });

    expect(screen.getByText(/Voda u prirodi stalno putuje\./)).toBeInTheDocument();
  });

  it('never shows a version the teacher has not approved', () => {
    renderApp({ path: '/student/lessons/biljke' });

    expect(screen.queryByText(/čeka pregled nastavnika/)).not.toBeInTheDocument();
    expect(findSentence(/Većina biljaka ima korijen/)).toBeDefined();
  });

  it('shows the approved illustrations with their descriptions', () => {
    renderApp({ path: '/student/lessons/kruzenje-vode' });

    expect(screen.getByRole('img', { name: /od nje nastaje oblak/ })).toHaveAttribute(
      'src',
      '/illustrations/water-cycle.svg',
    );
    expect(screen.getByText('Voda putuje u krug: more, para, oblak, kiša.')).toBeInTheDocument();
  });

  it('never mentions a diagnosis or the reason for an adaptation', () => {
    renderApp({ path: '/student/lessons/kruzenje-vode' });

    const pageText = document.body.textContent ?? '';
    for (const word of ['disleksij', 'dijagnoz', 'poremećaj', 'ADHD', 'teškoć']) {
      expect(pageText.toLowerCase()).not.toContain(word.toLowerCase());
    }
  });
});

describe('Reading settings', () => {
  it('starts from the easier-reading preset and lets the student change it', async () => {
    const { user } = renderApp({
      path: '/student/lessons/kruzenje-vode',
      studentNeeds: dyslexiaReader,
    });
    const lessonText = () => screen.getByText('Voda u prirodi stalno putuje.').closest('div');

    expect(lessonText()).toHaveClass('font-dyslexic', 'text-xl');

    await user.click(screen.getByRole('button', { name: 'Slova i boje' }));
    const panel = screen.getByRole('region', { name: 'Slova i boje' });
    await user.click(within(panel).getByRole('radio', { name: 'Obična' }));
    await user.click(within(panel).getByRole('radio', { name: 'Najveća' }));

    expect(lessonText()).toHaveClass('font-sans', 'text-2xl');
    expect(lessonText()).not.toHaveClass('font-dyslexic');
  });

  it('remembers the choice on this device and can reset it', async () => {
    const first = renderApp({
      path: '/student/lessons/kruzenje-vode',
      studentNeeds: dyslexiaReader,
    });
    await first.user.click(screen.getByRole('button', { name: 'Slova i boje' }));
    await first.user.click(screen.getByRole('radio', { name: 'Zaobljena' }));
    first.unmount();

    const second = renderApp({
      path: '/student/lessons/kruzenje-vode',
      studentNeeds: dyslexiaReader,
    });
    expect(screen.getByText('Voda u prirodi stalno putuje.').closest('div')).toHaveClass(
      'font-display',
    );

    await second.user.click(screen.getByRole('button', { name: 'Slova i boje' }));
    await second.user.click(screen.getByRole('button', { name: 'Vrati početna podešavanja' }));
    expect(screen.getByText('Voda u prirodi stalno putuje.').closest('div')).toHaveClass(
      'font-dyslexic',
    );
  });
});

describe('Lesson helpers', () => {
  it('shows the lesson step by step', async () => {
    const { user } = renderApp({ path: '/student/lessons/kruzenje-vode' });

    await user.click(screen.getByRole('button', { name: 'Korak po korak' }));
    expect(screen.getByText('Korak 1 od 4')).toBeInTheDocument();
    expect(screen.getByText('Sunce grije vodu.')).toBeInTheDocument();
    expect(findSentence('Para se diže u nebo.')).toBeUndefined();
    expect(screen.getByRole('button', { name: 'Prethodni korak' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Sljedeći korak' }));
    expect(screen.getByText('Korak 2 od 4')).toBeInTheDocument();
    expect(findSentence('Para se diže u nebo.')).toBeDefined();
  });

  it('explains a harder word when tapped', async () => {
    const { user } = renderApp({ path: '/student/lessons/kruzenje-vode' });

    const word = screen.getByRole('button', { name: 'isparavanje' });
    expect(word).toHaveAttribute('aria-expanded', 'false');

    await user.click(word);
    expect(word).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('note')).toHaveTextContent(/pretvori u paru/);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('says clearly when the device cannot read aloud', () => {
    // jsdom has no speech synthesis, like some real browsers.
    renderApp({ path: '/student/lessons/kruzenje-vode' });
    expect(screen.getByText('Ovaj pregledač ne može da čita naglas.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Poslušaj lekciju' })).not.toBeInTheDocument();
  });

  it('reads aloud with a local voice and highlights the current sentence', async () => {
    const spoken = stubVoice();
    const { user } = renderApp({
      path: '/student/lessons/kruzenje-vode',
      studentNeeds: { audio: false },
    });
    await user.click(screen.getByRole('button', { name: 'Poslušaj lekciju' }));

    expect(spoken).toEqual(['Sunce grije vodu.']);
    expect(screen.getByText('Sunce grije vodu.').closest('[data-sentence]')).toHaveAttribute(
      'data-active',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Pauza' })).toBeInTheDocument();
  });

  it('plays the approved audio script to a student who receives audio', async () => {
    const spoken = stubVoice();
    const { user } = renderApp({ path: '/student/lessons/kruzenje-vode' });
    await user.click(screen.getByRole('button', { name: 'Poslušaj lekciju' }));

    expect(spoken[0]).toMatch(/^Slušaj lekciju „Kruženje vode u prirodi“/);
  });
});

describe('Practice quiz', () => {
  it('gives feedback on every answer, has no score and ends with a star', async () => {
    const { user, router } = renderApp({ path: '/student/lessons/kruzenje-vode/quiz' });

    expect(screen.getByText('Pitanje 1 od 3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mjesec' }));
    expect(screen.getByRole('status')).toHaveTextContent('Nije baš tako.');
    expect(screen.getByRole('status')).toHaveTextContent('Tačan odgovor: Sunce');
    expect(screen.getByRole('button', { name: 'Sunce' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Sljedeće pitanje/ })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: /Sljedeće pitanje/ }));
    await user.click(screen.getByRole('button', { name: 'Od sitnih kapljica vode' }));
    expect(screen.getByRole('status')).toHaveTextContent('Tačno!');

    await user.click(screen.getByRole('button', { name: /Sljedeće pitanje/ }));
    await user.click(screen.getByRole('button', { name: 'Snijeg' }));
    await user.click(screen.getByRole('button', { name: /Završi kviz/ }));

    expect(
      screen.getByRole('heading', { level: 1, name: 'Bravo! Kviz je završen.' }),
    ).toBeInTheDocument();
    // Practice only: no points or "x of y correct" anywhere.
    expect(document.body.textContent).not.toMatch(/\d+\s*(od|\/)\s*\d+\s*tačn/i);

    await user.click(within(screen.getByRole('main')).getByRole('link', { name: 'Moji predmeti' }));
    expect(router.state.location.pathname).toBe('/student');
    // One star was already there (a lesson marked as done), plus one for this quiz.
    expect(
      within(screen.getByRole('main')).getByText('Zvjezdice za trud').nextElementSibling,
    ).toHaveTextContent('2');
  });
});

describe('Stars for effort', () => {
  it('marks a lesson as done for one star, and the quiz brings another', async () => {
    const { user } = renderApp({ path: '/student/lessons/kruzenje-vode' });
    const finish = screen.getByRole('region', { name: 'Kad završiš' });
    expect(finish).toHaveTextContent('+1 zvjezdica');

    await user.click(within(finish).getByRole('button', { name: 'Označi kao pređeno' }));
    expect(finish).toHaveTextContent('Lekcija je pređena. Zvjezdica je tvoja!');
    expect(
      within(finish).queryByRole('button', { name: 'Označi kao pređeno' }),
    ).not.toBeInTheDocument();
    expect(within(finish).getByRole('link', { name: 'Hajde na kviz' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /Moje zvjezdice/ }));
    expect(screen.getByRole('heading', { level: 1, name: 'Moje zvjezdice' })).toBeInTheDocument();
    expect(screen.getByText('2 zvjezdice')).toBeInTheDocument();
    const row = screen.getByRole('link', { name: 'Kruženje vode u prirodi' }).closest('li')!;
    expect(row).toHaveTextContent('Lekcija pređena');
    expect(row).toHaveTextContent('Kviz urađen: još nije');
    expect(row).toHaveTextContent('1 od 2 zvjezdice');
  });

  it('shows stars per lesson on the subject page', () => {
    renderApp({ path: '/student/subjects/matematika' });
    expect(screen.getByRole('link', { name: /Sabiranje do 100/ })).toHaveTextContent('Pređena');
    expect(screen.getByRole('link', { name: /Sabiranje do 100/ })).toHaveTextContent(
      '1 od 2 zvjezdice',
    );
  });
});

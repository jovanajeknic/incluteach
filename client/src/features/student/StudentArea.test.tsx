import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/renderApp';
import type { SupportProfile } from './types';

const standardReader: Partial<SupportProfile> = {
  preferSimplifiedText: false,
  preferMoreExamples: false,
  preferStepByStep: false,
  readingPreset: 'standard',
};

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

describe('Student subjects and lessons', () => {
  it('lists the student subjects with lesson counts', () => {
    renderApp({ path: '/student' });

    expect(screen.getByRole('heading', { level: 1, name: 'Zdravo, Luka!' })).toBeInTheDocument();
    const subjects = within(screen.getByRole('region', { name: 'Predmeti' })).getAllByRole('link');
    expect(subjects.map((link) => link.textContent)).toEqual([
      expect.stringContaining('Priroda i društvo'),
      expect.stringContaining('Matematika'),
      expect.stringContaining('Maternji jezik'),
      expect.stringContaining('Engleski jezik'),
      expect.stringContaining('Likovna kultura'),
    ]);
    expect(subjects[0]).toHaveTextContent('2 lekcije');
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
  it('shows the approved shorter version when the profile asks for it', () => {
    renderApp({ path: '/student/lessons/kruzenje-vode' });

    expect(screen.getByText('kraća verzija')).toBeInTheDocument();
    expect(screen.getByText('Sunce grije vodu.')).toBeInTheDocument();
  });

  it('shows the standard version to a student without that need', () => {
    renderApp({ path: '/student/lessons/kruzenje-vode', studentNeeds: standardReader });

    expect(screen.queryByText('kraća verzija')).not.toBeInTheDocument();
    expect(screen.getByText(/Voda u prirodi stalno putuje\./)).toBeInTheDocument();
  });

  it('never shows a version the teacher has not approved', () => {
    renderApp({ path: '/student/lessons/biljke' });

    expect(screen.queryByText(/čeka pregled nastavnika/)).not.toBeInTheDocument();
    expect(screen.queryByText('kraća verzija')).not.toBeInTheDocument();
    expect(findSentence(/Većina biljaka ima korijen/)).toBeDefined();
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
    const { user } = renderApp({ path: '/student/lessons/kruzenje-vode' });
    const lessonText = () => screen.getByText('Sunce grije vodu.').closest('div');

    expect(lessonText()).toHaveClass('font-dyslexic', 'text-xl');

    await user.click(screen.getByRole('button', { name: 'Slova i boje' }));
    const panel = screen.getByRole('region', { name: 'Slova i boje' });
    await user.click(within(panel).getByRole('radio', { name: 'Obična' }));
    await user.click(within(panel).getByRole('radio', { name: 'Najveća' }));

    expect(lessonText()).toHaveClass('font-sans', 'text-2xl');
    expect(lessonText()).not.toHaveClass('font-dyslexic');
  });

  it('remembers the choice on this device and can reset it', async () => {
    const first = renderApp({ path: '/student/lessons/kruzenje-vode' });
    await first.user.click(screen.getByRole('button', { name: 'Slova i boje' }));
    await first.user.click(screen.getByRole('radio', { name: 'Zaobljena' }));
    first.unmount();

    const second = renderApp({ path: '/student/lessons/kruzenje-vode' });
    expect(screen.getByText('Sunce grije vodu.').closest('div')).toHaveClass('font-display');

    await second.user.click(screen.getByRole('button', { name: 'Slova i boje' }));
    await second.user.click(screen.getByRole('button', { name: 'Vrati početna podešavanja' }));
    expect(screen.getByText('Sunce grije vodu.').closest('div')).toHaveClass('font-dyslexic');
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

    const { user } = renderApp({ path: '/student/lessons/kruzenje-vode' });
    await user.click(screen.getByRole('button', { name: 'Poslušaj lekciju' }));

    expect(spoken).toEqual(['Sunce grije vodu.']);
    expect(screen.getByText('Sunce grije vodu.').closest('[data-sentence]')).toHaveAttribute(
      'data-active',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Pauza' })).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: /Završi vježbu/ }));

    expect(
      screen.getByRole('heading', { level: 1, name: 'Bravo! Vježba je završena.' }),
    ).toBeInTheDocument();
    // Practice only: no points or "x of y correct" anywhere.
    expect(document.body.textContent).not.toMatch(/\d+\s*(od|\/)\s*\d+\s*tačn/i);

    await user.click(within(screen.getByRole('main')).getByRole('link', { name: 'Moji predmeti' }));
    expect(router.state.location.pathname).toBe('/student');
    expect(screen.getByText('Zvjezdice za trud').nextElementSibling).toHaveTextContent('1');
  });
});

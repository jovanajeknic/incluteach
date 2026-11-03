import { act, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/renderApp';

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);
});
afterEach(() => vi.unstubAllGlobals());

describe('Parent overview', () => {
  it('lists only the linked children with their progress', () => {
    renderApp({ path: '/parent' });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Dobro došli, Jelena' }),
    ).toBeInTheDocument();
    const list = within(screen.getByRole('region', { name: 'Povezana djeca' })).getAllByRole(
      'link',
    );
    expect(list).toHaveLength(2);
    expect(list[0]).toHaveTextContent('Luka Petrović');
    expect(list[1]).toHaveTextContent('Mia Petrović');
    expect(list[1]).toHaveTextContent('Započetih lekcija: 1 · Završenih: 1');
  });

  it('refuses a child that is not linked to this parent', () => {
    renderApp({ path: '/parent/children/demo-student-ana' });
    expect(screen.getByRole('heading', { level: 1, name: 'Nemate pristup' })).toBeInTheDocument();
    expect(screen.getByText('Ovo dijete nije povezano sa vašim nalogom.')).toBeInTheDocument();
  });

  it('refuses a lesson of a child that is not linked', () => {
    renderApp({ path: '/parent/children/demo-student-ana/lessons/kruzenje-vode' });
    expect(screen.getByRole('heading', { level: 1, name: 'Nemate pristup' })).toBeInTheDocument();
  });
});

describe('Child lessons', () => {
  it('groups the child lessons by subject with their status', async () => {
    const { user, router } = renderApp({ path: '/parent' });

    await user.click(screen.getByRole('link', { name: /Mia Petrović/ }));
    expect(router.state.location.pathname).toBe('/parent/children/demo-student-mia');
    expect(screen.getByRole('heading', { level: 1, name: 'Mia Petrović' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Priroda i društvo' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Kruženje vode u prirodi/ })).toHaveTextContent(
      'Završena',
    );
    expect(screen.getByRole('link', { name: /Sabiranje do 100/ })).toHaveTextContent('Započeta');
  });

  it('shows the lesson as the child sees it, the practice and home guidance', () => {
    renderApp({ path: '/parent/children/demo-student-mia/lessons/kruzenje-vode' });

    expect(screen.getByText('Lekcija kako je vidi Mia')).toBeInTheDocument();
    expect(screen.getByText('Osnovna verzija')).toBeInTheDocument();

    const practice = screen.getByRole('region', { name: 'Vježba' });
    expect(practice).toHaveTextContent('Vježba je urađena 2. novembar 2026.');
    expect(within(practice).getByText('Gdje je bilo teško')).toBeInTheDocument();
    expect(practice).toHaveTextContent('Od čega nastaju oblaci?');
    expect(practice).not.toHaveTextContent('Šta grije vodu');

    const home = screen.getByRole('region', { name: 'Za rad kod kuće' });
    expect(home).toHaveTextContent(/čašu vode na suncu/);
  });

  it('shows practice done live in the student area, including where it was hard', async () => {
    const { user, router } = renderApp({ path: '/student/lessons/kruzenje-vode/quiz' });

    await user.click(screen.getByRole('button', { name: 'Mjesec' }));
    await user.click(screen.getByRole('button', { name: /Sljedeće pitanje/ }));
    await user.click(screen.getByRole('button', { name: 'Od sitnih kapljica vode' }));
    await user.click(screen.getByRole('button', { name: /Sljedeće pitanje/ }));
    await user.click(screen.getByRole('button', { name: 'Snijeg' }));
    await user.click(screen.getByRole('button', { name: /Završi vježbu/ }));

    await act(() => router.navigate('/parent/children/demo-student-luka/lessons/kruzenje-vode'));

    expect(screen.getByText('Verzija nižeg nivoa')).toBeInTheDocument();
    const practice = screen.getByRole('region', { name: 'Vježba' });
    expect(practice).toHaveTextContent('Šta grije vodu u morima i rijekama?');
    expect(practice).not.toHaveTextContent('Od čega nastaju oblaci?');
  });
});

describe('Suggestions for the teacher', () => {
  it('requires text and focuses the field', async () => {
    const { user } = renderApp({ path: '/parent/children/demo-student-luka' });

    await user.click(screen.getByRole('button', { name: 'Pošalji nastavniku' }));

    expect(screen.getByText('Napišite prijedlog prije slanja.')).toBeInTheDocument();
    expect(screen.getByLabelText('Vaš prijedlog')).toHaveFocus();
  });

  it('records a suggestion as waiting for the teacher, without sending anything', async () => {
    const { user } = renderApp({
      path: '/parent/children/demo-student-luka/lessons/kruzenje-vode',
    });

    await user.type(
      screen.getByLabelText('Vaš prijedlog'),
      'Lakše prati kad su rečenice kratke i uz sliku.',
    );
    await user.click(screen.getByRole('button', { name: 'Pošalji nastavniku' }));

    expect(screen.getByRole('status')).toHaveTextContent(/ništa nije stvarno poslato/);
    expect(screen.getByLabelText('Vaš prijedlog')).toHaveValue('');
    const list = screen.getByRole('region', { name: 'Vaši prijedlozi' });
    expect(list).toHaveTextContent('Lakše prati kad su rečenice kratke i uz sliku.');
    expect(list).toHaveTextContent('Lekcija: Kruženje vode u prirodi');
    expect(list).toHaveTextContent('Čeka pregled nastavnika');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('never shows the suggestion to the child', async () => {
    const { user, router } = renderApp({ path: '/parent/children/demo-student-luka' });

    await user.type(screen.getByLabelText('Vaš prijedlog'), 'Treba mu više vremena za čitanje.');
    await user.click(screen.getByRole('button', { name: 'Pošalji nastavniku' }));
    expect(screen.getByText('Treba mu više vremena za čitanje.')).toBeInTheDocument();

    await act(() => router.navigate('/student/lessons/kruzenje-vode'));
    expect(
      screen.getByRole('heading', { level: 1, name: 'Kruženje vode u prirodi' }),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('Treba mu više vremena za čitanje.');
  });
});

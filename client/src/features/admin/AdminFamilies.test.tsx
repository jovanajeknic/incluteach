import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { managedUser } from '@/test/adminApiFixtures';
import { apiError } from '@/test/authFixtures';
import { renderApp } from '@/test/renderApp';
import { server } from '@/test/server';
import type { LinkedPerson, ParentLink } from './api/familiesApi';
import type { ManagedUser } from './api/usersApi';

const ana = managedUser({
  id: 'k1',
  username: 'ana_markovic',
  fullName: 'Ana Marković',
  role: 'student',
});
const luka = managedUser({
  id: 'k2',
  username: 'luka_jovic',
  fullName: 'Luka Jović',
  role: 'student',
});
const petar = managedUser({
  id: 'p1',
  username: 'petar_markovic',
  fullName: 'Petar Marković',
  role: 'parent',
});
const jelena = managedUser({
  id: 'p2',
  username: 'jelena_markovic',
  fullName: 'Jelena Marković',
  role: 'parent',
});

const person = (user: ManagedUser, overrides: Partial<LinkedPerson> = {}): LinkedPerson => ({
  id: user.id,
  fullName: user.fullName,
  username: user.username,
  deactivated: false,
  deleted: false,
  ...overrides,
});

const linkOf = (parent: LinkedPerson, child: ManagedUser = ana): ParentLink => ({
  parent,
  student: person(child),
  createdAt: '2026-09-02T08:00:00.000Z',
});

interface Options {
  users?: ManagedUser[];
  links?: ParentLink[];
}

/** A school that answers like the server and remembers what it was asked. */
function keepFamilies({ users = [ana, luka, petar, jelena], links = [] }: Options = {}) {
  const state = {
    links,
    asked: [] as URLSearchParams[],
    askedParents: [] as string[],
    linked: [] as unknown[],
  };
  server.use(
    http.get('*/api/users/:id', ({ params }) => {
      const found = users.find((user) => user.id === params.id);
      return found
        ? HttpResponse.json({ user: found })
        : HttpResponse.json(apiError('not_found'), { status: 404 });
    }),
    http.get('*/api/users', ({ request }) => {
      const query = new URL(request.url).searchParams;
      state.asked.push(query);
      const text = query.get('search')?.toLowerCase();
      const found = users.filter(
        (user) =>
          (!query.get('role') || user.role === query.get('role')) &&
          (!text || user.fullName.toLowerCase().includes(text)),
      );
      return HttpResponse.json({ users: found, total: found.length });
    }),
    http.get('*/api/parent-students', ({ request }) => {
      const studentId = new URL(request.url).searchParams.get('studentId')!;
      state.askedParents.push(studentId);
      const found = state.links.filter((link) => link.student.id === studentId);
      return HttpResponse.json({ links: found, total: found.length });
    }),
    http.post('*/api/parent-students', async ({ request }) => {
      const body = (await request.json()) as { parentId: string; studentId: string };
      state.linked.push(body);
      const parent = users.find((user) => user.id === body.parentId)!;
      const created = linkOf(person(parent));
      state.links = [...state.links, created];
      return HttpResponse.json({ link: created }, { status: 201 });
    }),
  );
  return state;
}

describe('Porodice', () => {
  it('lists the children, each leading to their own page, and offers a new child', async () => {
    const state = keepFamilies();
    renderApp({ path: '/admin/families' });

    const list = within(await screen.findByRole('region', { name: 'Lista djece' }));
    const links = await list.findAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAccessibleName('Otvori porodicu: Ana Marković');
    expect(links[0]).toHaveAttribute('href', '/admin/families/k1');
    expect(links[0]).toHaveTextContent('Korisničko ime: ana_markovic');
    expect(links[1]).toHaveAttribute('href', '/admin/families/k2');
    // Only children, and only those who are still at the school.
    expect(state.asked[0]!.get('role')).toBe('student');
    expect(state.asked[0]!.get('status')).toBe('active');
    expect(screen.getByRole('link', { name: 'Novo dijete' })).toHaveAttribute(
      'href',
      '/admin/users/new?role=student',
    );
    expect(screen.getByRole('link', { name: 'Porodice' })).toHaveAttribute('aria-current', 'page');
  });

  it('searches the children', async () => {
    const state = keepFamilies();
    const { user } = renderApp({ path: '/admin/families' });
    await screen.findByText('Luka Jović');

    await user.type(screen.getByLabelText(/Pretraga djece/), 'luka');

    await waitFor(() => expect(state.asked[state.asked.length - 1]!.get('search')).toBe('luka'));
    await waitFor(() => expect(screen.queryByText('Ana Marković')).not.toBeInTheDocument());
  });

  it('tells there are no children yet, and that a search found nobody', async () => {
    keepFamilies({ users: [petar] });
    const { user } = renderApp({ path: '/admin/families' });

    expect(await screen.findByText(/U školi još nema djece/)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Pretraga djece/), 'xyz');

    expect(await screen.findByText('Nijedno dijete ne odgovara pretrazi.')).toBeInTheDocument();
  });
});

describe('The family of a child', () => {
  it('shows the child and their parents', async () => {
    const state = keepFamilies({ links: [linkOf(person(petar))] });
    renderApp({ path: '/admin/families/k1' });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ana Marković' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Korisničko ime: ana_markovic')).toBeInTheDocument();
    // Petar is linked, so he is in the family and not in the offer below it.
    expect(await screen.findByText('Petar Marković')).toBeInTheDocument();
    expect(screen.getByText('Korisničko ime: petar_markovic')).toBeInTheDocument();
    expect(state.askedParents).toEqual(['k1']);
    expect(screen.getByRole('link', { name: 'Nazad na porodice' })).toHaveAttribute(
      'href',
      '/admin/families',
    );
  });

  it('says when the child has no parent yet', async () => {
    keepFamilies();
    renderApp({ path: '/admin/families/k1' });

    expect(
      await screen.findByText('Dijete još nema povezanog roditelja ni staratelja.'),
    ).toBeInTheDocument();
  });

  it('marks a parent who left the school, and does not show the name of an erased one', async () => {
    keepFamilies({
      links: [
        linkOf(person(petar, { deactivated: true })),
        linkOf(person(jelena, { fullName: 'Deleted user', deactivated: true, deleted: true })),
      ],
    });
    renderApp({ path: '/admin/families/k1' });

    expect(await screen.findByText('Napustio školu')).toBeInTheDocument();
    expect(screen.getByText('Obrisan korisnik')).toBeInTheDocument();
    expect(screen.queryByText('Deleted user')).not.toBeInTheDocument();
  });

  it('says the child does not exist for an unknown child and for a person who is not a child', async () => {
    const state = keepFamilies();
    renderApp({ path: '/admin/families/p1' });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Dijete nije pronađeno' }),
    ).toBeInTheDocument();
    expect(state.askedParents).toEqual([]);
  });

  it('says the child does not exist when the address is wrong', async () => {
    keepFamilies();
    renderApp({ path: '/admin/families/nepoznat' });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Dijete nije pronađeno' }),
    ).toBeInTheDocument();
  });

  it('offers a retry when the child cannot be loaded', async () => {
    let calls = 0;
    keepFamilies();
    server.use(
      http.get('*/api/users/:id', () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(apiError('internal_error'), { status: 500 })
          : HttpResponse.json({ user: ana });
      }),
    );
    const { user } = renderApp({ path: '/admin/families/k1' });

    await user.click(await screen.findByRole('button', { name: 'Pokušaj ponovo' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ana Marković' }),
    ).toBeInTheDocument();
  });
});

describe('Linking a parent', () => {
  it('asks first, then links, and the parent moves from the offer to the family', async () => {
    const state = keepFamilies({ links: [linkOf(person(petar))] });
    const { user } = renderApp({ path: '/admin/families/k1' });
    const offer = await screen.findByRole('region', { name: 'Roditelji koje možeš povezati' });

    // The parent who is already linked is not offered again.
    expect(await within(offer).findByText('Jelena Marković')).toBeInTheDocument();
    expect(within(offer).queryByText('Petar Marković')).not.toBeInTheDocument();

    await user.click(within(offer).getByRole('button', { name: 'Poveži: Jelena Marković' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Povezati Jelena Marković sa djetetom Ana Marković?');
    expect(dialog).toHaveTextContent('Veza se ne može ukloniti');
    expect(state.linked).toEqual([]);
    await user.click(within(dialog).getByRole('button', { name: 'Da, poveži' }));

    expect(
      await screen.findByText('Jelena Marković je povezan sa djetetom Ana Marković.'),
    ).toBeInTheDocument();
    expect(state.linked).toEqual([{ parentId: 'p2', studentId: 'k1' }]);
    await waitFor(() =>
      expect(within(offer).queryByText('Jelena Marković')).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('heading', { name: 'Roditelji i staratelji' })).toBeInTheDocument();
    expect(screen.getAllByText('Jelena Marković').length).toBe(1);
  });

  it('does not link when the question is answered with Odustani', async () => {
    const state = keepFamilies();
    const { user } = renderApp({ path: '/admin/families/k1' });

    await user.click(await screen.findByRole('button', { name: 'Poveži: Petar Marković' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Odustani' }),
    );

    expect(state.linked).toEqual([]);
  });

  it('searches the parents', async () => {
    const state = keepFamilies();
    const { user } = renderApp({ path: '/admin/families/k1' });
    await screen.findByRole('button', { name: 'Poveži: Petar Marković' });

    await user.type(screen.getByLabelText(/Pretraga roditelja/), 'jelena');

    await waitFor(() => {
      const last = state.asked[state.asked.length - 1]!;
      expect(last.get('role')).toBe('parent');
      expect(last.get('search')).toBe('jelena');
    });
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Poveži: Petar Marković' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('says when somebody linked the parent in the meantime', async () => {
    keepFamilies();
    server.use(
      http.post('*/api/parent-students', () =>
        HttpResponse.json(apiError('link_exists'), { status: 409 }),
      ),
    );
    const { user } = renderApp({ path: '/admin/families/k1' });

    await user.click(await screen.findByRole('button', { name: 'Poveži: Petar Marković' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Da, poveži' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('već povezan');
  });

  it('points to a new parent account', async () => {
    keepFamilies({ users: [ana] });
    renderApp({ path: '/admin/families/k1' });

    expect(await screen.findByText('Nema roditelja koji se mogu povezati.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Novi roditelj' })).toHaveAttribute(
      'href',
      '/admin/users/new?role=parent',
    );
  });
});

import type { ManagedUser } from '@/features/admin/api/usersApi';

// Fictional people, in the shape the API answers an administrator with.

/** An activated teacher unless said otherwise. */
export function managedUser(overrides: Partial<ManagedUser> = {}): ManagedUser {
  return {
    id: 'u1',
    username: 'milica_petrovic',
    fullName: 'Milica Petrović',
    email: 'milica@primjer.me',
    role: 'teacher',
    activated: true,
    deactivatedAt: null,
    createdAt: '2026-09-01T08:00:00.000Z',
    ...overrides,
  };
}

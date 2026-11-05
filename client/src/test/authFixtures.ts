import type { AuthUser, Role } from '@/features/auth/api/authApi';

/** Fictional people, in the shape `GET /auth/me` returns. */
export const testUsers: Record<Role, AuthUser> = {
  admin: {
    id: '00000000-0000-4000-8000-000000000001',
    username: 'marija_demic',
    fullName: 'Marija Demić',
    email: 'marija@primjer.me',
    role: 'admin',
    schoolId: '00000000-0000-4000-8000-0000000000aa',
  },
  teacher: {
    id: '00000000-0000-4000-8000-000000000002',
    username: 'milica_petrovic',
    fullName: 'Milica Petrović',
    email: 'milica@primjer.me',
    role: 'teacher',
    schoolId: '00000000-0000-4000-8000-0000000000aa',
  },
  student: {
    id: '00000000-0000-4000-8000-000000000003',
    username: 'ana_markovic',
    fullName: 'Ana Marković',
    email: null,
    role: 'student',
    schoolId: '00000000-0000-4000-8000-0000000000aa',
  },
  parent: {
    id: '00000000-0000-4000-8000-000000000004',
    username: 'petar_markovic',
    fullName: 'Petar Marković',
    email: 'petar@primjer.me',
    role: 'parent',
    schoolId: '00000000-0000-4000-8000-0000000000aa',
  },
};

/** An error answer in the format of the API contract. */
export const apiError = (code: string, message = code) => ({ error: { code, message } });

import { adminHomePath } from '@/features/admin/paths';
import { teacherHomePath } from '@/features/lessons/paths';
import { parentHomePath } from '@/features/parent/paths';
import { studentHomePath } from '@/features/student/paths';
import type { Role } from './api/authApi';

export const loginPath = '/login';
/** Opened from the school's activation link, which carries the one-time code as ?token=. */
export const activatePath = '/activate';

const homePaths: Record<Role, string> = {
  admin: adminHomePath,
  teacher: teacherHomePath,
  student: studentHomePath,
  parent: parentHomePath,
};

/** Where a signed-in person of this role starts. */
export const homePathForRole = (role: Role) => homePaths[role];

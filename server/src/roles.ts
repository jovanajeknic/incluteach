// Must match the values of the user_role enum in the database
// (see migrations/*_add-user-role.sql); roles.test.ts checks that they stay in sync.
export const USER_ROLES = ['admin', 'teacher', 'student', 'parent'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}

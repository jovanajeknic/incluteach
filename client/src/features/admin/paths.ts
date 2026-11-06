export const adminHomePath = '/admin';
export const adminUsersPath = '/admin/users';
export const adminNewUserPath = '/admin/users/new';
export const adminClassesPath = '/admin/classes';
export const adminSubjectsPath = '/admin/subjects';
/** The subjects of one odeljenje, as the page of the odeljenja links to them. */
export const adminClassSubjectsPath = (classId: string, schoolYear: number) =>
  `${adminSubjectsPath}?${new URLSearchParams({ schoolYear: String(schoolYear), classId })}`;
export const adminFamiliesPath = '/admin/families';
/** The page of one child: their parents, and linking one more. */
export const adminFamilyPath = (studentId: string) =>
  `${adminFamiliesPath}/${encodeURIComponent(studentId)}`;
/** The form for a new account with the role already chosen. */
export const adminNewUserWithRolePath = (role: 'student' | 'parent') =>
  `${adminNewUserPath}?${new URLSearchParams({ role })}`;

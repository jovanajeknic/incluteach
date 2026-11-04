import { issueActivationToken, type IssuedActivation } from '../auth/activation.ts';
import type { AuthUser } from '../auth/sessions.ts';
import type { Queryable } from '../db/pool.ts';
import { createUser } from '../users/createUser.ts';

export interface SchoolWithAdmin {
  school: { id: string; name: string };
  admin: AuthUser;
  activation: IssuedActivation;
}

// Sets up a new school and its first admin. The admin has no password yet: they open the
// activation link and choose one themselves, so no password ever passes through the terminal.
// The caller should run this inside a transaction so a failure leaves nothing half-created.
export async function createSchoolWithAdmin(
  pool: Queryable,
  { schoolName, adminName }: { schoolName: string; adminName: string },
): Promise<SchoolWithAdmin> {
  const { rows } = await pool.query<{ id: string; name: string }>(
    'INSERT INTO schools (name) VALUES ($1) RETURNING id, name',
    [schoolName],
  );
  const school = rows[0];

  const admin = await createUser(pool, {
    schoolId: school.id,
    role: 'admin',
    fullName: adminName,
  });
  // There is no other admin yet, so the new admin is recorded as the one who issued the link.
  const activation = await issueActivationToken(pool, {
    userId: admin.id,
    schoolId: school.id,
    adminId: admin.id,
  });

  return { school, admin, activation };
}

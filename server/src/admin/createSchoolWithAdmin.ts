import { issueActivationToken, type IssuedActivation } from '../auth/activation.ts';
import type { AuthUser } from '../auth/sessions.ts';
import type { Queryable } from '../db/pool.ts';
import { createUser } from '../users/createUser.ts';

export interface SchoolWithAdmin {
  school: { id: string; name: string };
  // False when the admin was added to a school that already existed.
  schoolCreated: boolean;
  admin: AuthUser;
  activation: IssuedActivation;
}

export interface CreateSchoolWithAdminOptions {
  schoolName: string;
  adminName: string;
  // Creates a separate school even if one with this name exists, for example when two
  // towns each have a school with the same name.
  forceNewSchool?: boolean;
}

// Sets up an admin for a school. If a school with this name already exists (letter case does
// not matter), the new admin joins it instead of a second school being created. The admin has
// no password yet: they open the activation link and choose one themselves, so no password
// ever passes through the terminal.
// The caller should run this inside a transaction so a failure leaves nothing half-created.
export async function createSchoolWithAdmin(
  pool: Queryable,
  { schoolName, adminName, forceNewSchool = false }: CreateSchoolWithAdminOptions,
): Promise<SchoolWithAdmin> {
  const existing = forceNewSchool
    ? []
    : (
        await pool.query<{ id: string; name: string }>(
          'SELECT id, name FROM schools WHERE lower(name) = lower($1)',
          [schoolName],
        )
      ).rows;

  if (existing.length > 1) {
    throw new Error(
      `${existing.length} schools are called "${schoolName}", so it is unclear which one is meant.`,
    );
  }

  let school = existing[0];
  const schoolCreated = !school;
  if (!school) {
    const { rows } = await pool.query<{ id: string; name: string }>(
      'INSERT INTO schools (name) VALUES ($1) RETURNING id, name',
      [schoolName],
    );
    school = rows[0];
  }

  const admin = await createUser(pool, {
    schoolId: school.id,
    role: 'admin',
    fullName: adminName,
  });
  // The new admin is recorded as the one who issued their own first link. Once the admin has
  // a password, other admins of the school can issue new links for them.
  const activation = await issueActivationToken(pool, {
    userId: admin.id,
    schoolId: school.id,
    adminId: admin.id,
  });

  return { school, schoolCreated, admin, activation };
}

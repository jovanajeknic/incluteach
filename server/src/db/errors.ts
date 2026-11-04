// The code PostgreSQL gives when a unique rule is broken, for example two classes with
// the same name. Code that checks first can still meet it when two requests race.
const UNIQUE_VIOLATION = '23505';

export function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === UNIQUE_VIOLATION;
}

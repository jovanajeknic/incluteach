// Used by Vitest only. The database tests expect empty tables (some count every row), so they
// must not see the demo data of `npm run seed:demo` that lives in the development tables.
// When TEST_DB_SCHEMA is set, the tests work in that schema (a separate set of tables inside
// the same database), made by `npm run migrate:test`. Nothing in the other schemas is touched.
import './loadEnv.ts';

const schema = process.env.TEST_DB_SCHEMA?.trim();

if (schema) {
  // The name goes into a connection setting, so only plain lowercase names are accepted.
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(schema)) {
    throw new Error(`TEST_DB_SCHEMA must be a plain lowercase name, got "${schema}".`);
  }
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('TEST_DB_SCHEMA needs DATABASE_URL to be set.');
  }
  const url = new URL(databaseUrl);
  url.searchParams.set('options', `-c search_path=${schema}`);
  process.env.DATABASE_URL = url.toString();
}

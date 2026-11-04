export interface Config {
  databaseUrl: string;
  port: number;
}

const DEFAULT_PORT = 3000;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const databaseUrl = env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env and fill in your database details.',
    );
  }

  return { databaseUrl, port: parsePort(env.PORT) };
}

function parsePort(value: string | undefined): number {
  const text = value?.trim();
  if (!text) {
    return DEFAULT_PORT;
  }

  const port = Number(text);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be a whole number between 1 and 65535, got "${text}".`);
  }
  return port;
}

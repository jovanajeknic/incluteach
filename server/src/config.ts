import { AI_PROVIDERS, type AiProviderName } from './ai/index.ts';

export interface Config {
  databaseUrl: string;
  port: number;
  // Cookies marked Secure are sent only over HTTPS, so this is on in production only.
  secureCookies: boolean;
  // Address of the website, used to build the activation links that admins send out.
  publicUrl: string;
  // Which AI service makes summaries and quizzes. "fake" makes invented but complete results.
  aiProvider: AiProviderName;
}

const DEFAULT_PORT = 3000;
// Where the Vite development server of the frontend runs.
const DEFAULT_PUBLIC_URL = 'http://localhost:5173';

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const databaseUrl = env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env and fill in your database details.',
    );
  }

  return {
    databaseUrl,
    port: parsePort(env.PORT),
    secureCookies: env.NODE_ENV === 'production',
    publicUrl: parsePublicUrl(env.PUBLIC_URL),
    aiProvider: parseAiProvider(env.AI_PROVIDER),
  };
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

function parsePublicUrl(value: string | undefined): string {
  const text = value?.trim() || DEFAULT_PUBLIC_URL;

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new Error(
      `PUBLIC_URL must be a full web address like https://example.com, got "${text}".`,
    );
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`PUBLIC_URL must start with http:// or https://, got "${text}".`);
  }

  // Without a trailing slash, so "/activate" can be appended safely.
  return url.origin + url.pathname.replace(/\/+$/, '');
}

function parseAiProvider(value: string | undefined): AiProviderName {
  const name = value?.trim() || 'fake';
  if (!(AI_PROVIDERS as readonly string[]).includes(name)) {
    throw new Error(`AI_PROVIDER must be one of: ${AI_PROVIDERS.join(', ')}. Got "${name}".`);
  }
  return name as AiProviderName;
}

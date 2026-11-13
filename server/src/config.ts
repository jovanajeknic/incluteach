import { AI_PROVIDERS, type AiProviderName } from './ai/index.ts';

export interface Config {
  databaseUrl: string;
  port: number;
  // Cookies marked Secure are sent only over HTTPS, so this is on in production only.
  secureCookies: boolean;
  // How many proxies stand between the browser and this server (0 on a computer). Needed so that
  // the per-address limit on failed sign-ins sees the visitor's address, not the proxy's.
  trustProxyHops: number;
  // Address of the website, used to build the activation links that admins send out.
  publicUrl: string;
  // Which AI service makes summaries and quizzes. "fake" makes invented but complete results.
  aiProvider: AiProviderName;
  // The key and the model of a real AI service. The key is a secret: it is read here and
  // handed to the service, and never printed or stored anywhere.
  aiApiKey: string | undefined;
  aiModel: string | undefined;
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

  const aiProvider = parseAiProvider(env.AI_PROVIDER);
  const aiApiKey = env.GROQ_API_KEY?.trim() || undefined;
  if (aiProvider === 'groq' && !aiApiKey) {
    throw new Error(
      'AI_PROVIDER is "groq", but GROQ_API_KEY is not set. Add your key to server/.env.',
    );
  }

  return {
    databaseUrl,
    port: parsePort(env.PORT),
    secureCookies: env.NODE_ENV === 'production',
    trustProxyHops: parseTrustProxyHops(env.TRUST_PROXY),
    publicUrl: parsePublicUrl(env.PUBLIC_URL),
    aiProvider,
    aiApiKey,
    aiModel: parseAiModel(env.AI_MODEL),
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

function parseTrustProxyHops(value: string | undefined): number {
  const text = value?.trim();
  if (!text) {
    return 0;
  }

  const hops = Number(text);
  if (!Number.isInteger(hops) || hops < 0 || hops > 5) {
    throw new Error(`TRUST_PROXY must be a whole number between 0 and 5, got "${text}".`);
  }
  return hops;
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

// The name of a model, as the AI service writes it (for example "openai/gpt-oss-120b"). Empty
// means the default of the service.
function parseAiModel(value: string | undefined): string | undefined {
  const name = value?.trim();
  if (!name) {
    return undefined;
  }
  if (!/^[a-z0-9][a-z0-9._/-]{0,63}$/i.test(name)) {
    throw new Error(
      `AI_MODEL must be the name of a model, like openai/gpt-oss-120b. Got "${name}".`,
    );
  }
  return name;
}

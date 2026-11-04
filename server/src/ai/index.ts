import { createFakeAi } from './fake.ts';
import type { AiProvider } from './types.ts';

// The AI services the server knows. To plug in another one, write an object like the fake one
// (see types.ts), add its name here and name it in AI_PROVIDER in .env.
export const AI_PROVIDERS = ['fake'] as const;

export type AiProviderName = (typeof AI_PROVIDERS)[number];

export function createAiProvider(name: AiProviderName): AiProvider {
  switch (name) {
    case 'fake':
      return createFakeAi();
  }
}

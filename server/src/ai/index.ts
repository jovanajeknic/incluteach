import { createFakeAi } from './fake.ts';
import { createGroqAi } from './groq.ts';
import { withLatinScript } from './script.ts';
import type { AiProvider } from './types.ts';

// The AI services the server knows. To plug in another one, write an object like the fake one
// (see types.ts), add its name here and name it in AI_PROVIDER in .env.
export const AI_PROVIDERS = ['fake', 'groq'] as const;

export type AiProviderName = (typeof AI_PROVIDERS)[number];

// What a real service needs to be reached. The key comes from .env and goes nowhere else.
export interface AiSettings {
  apiKey?: string;
  model?: string;
}

export function createAiProvider(name: AiProviderName, settings: AiSettings = {}): AiProvider {
  switch (name) {
    case 'fake':
      return createFakeAi();
    case 'groq':
      if (!settings.apiKey) {
        throw new Error('The groq AI service needs GROQ_API_KEY.');
      }
      // The services write better Serbian in Latin script (see script.ts).
      return withLatinScript(createGroqAi({ apiKey: settings.apiKey, model: settings.model }));
  }
}

import type { AuthResult, AuthService } from './authService';

/** Long enough to show the loading state, short enough not to annoy. */
const DEMO_DELAY_MS = 500;

async function demoResult(): Promise<AuthResult> {
  await new Promise<void>((resolve) => setTimeout(resolve, DEMO_DELAY_MS));
  return { mode: 'demo' };
}

/**
 * Demo-only authentication. It deliberately ignores the submitted values: nothing is sent
 * over the network, stored, logged or turned into a token or session.
 */
export const demoAuthService: AuthService = {
  login: demoResult,
  loginWithCard: demoResult,
  activate: demoResult,
};

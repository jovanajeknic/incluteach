import type { AuthResult, AuthService } from './authService';

/** Long enough to show the loading state, short enough not to annoy. */
const DEMO_DELAY_MS = 500;

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Demo-only authentication. It deliberately ignores the submitted values: nothing is sent
 * over the network, stored, logged or turned into a token or session.
 */
export const demoAuthService: AuthService = {
  async login(): Promise<AuthResult> {
    await wait(DEMO_DELAY_MS);
    return { mode: 'demo' };
  },

  async register(): Promise<AuthResult> {
    await wait(DEMO_DELAY_MS);
    return { mode: 'demo' };
  },
};

import type { SchoolRequestValues } from './schoolRequestSchema';

export interface SchoolRequestService {
  submit(request: SchoolRequestValues): Promise<{ mode: 'demo' }>;
}

/** Long enough to show the sending state. */
const DEMO_DELAY_MS = 500;

/**
 * Demo only: the request is validated in the form and then dropped. Nothing is sent over
 * the network, stored or logged. Replace it once the backend offers an endpoint.
 */
export const schoolRequestService: SchoolRequestService = {
  async submit() {
    await new Promise<void>((resolve) => setTimeout(resolve, DEMO_DELAY_MS));
    return { mode: 'demo' };
  },
};

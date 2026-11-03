import type { RegistrationRole } from '../schemas';
import { demoAuthService } from './demoAuthService';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  role: RegistrationRole;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

/**
 * `demo` means the form was validated but nothing was signed in or created.
 * A real implementation will add its own result once the API contract exists.
 */
export interface AuthResult {
  mode: 'demo';
}

/** What the sign-in and registration screens may do; they depend only on this interface. */
export interface AuthService {
  login(request: LoginRequest): Promise<AuthResult>;
  register(request: RegisterRequest): Promise<AuthResult>;
}

// No backend authentication or API contract exists yet, so the demo service is used.
// Replace it here once the backend developer provides the real endpoints.
export const authService: AuthService = demoAuthService;

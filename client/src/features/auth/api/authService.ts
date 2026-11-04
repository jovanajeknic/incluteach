import { demoAuthService } from './demoAuthService';

export interface LoginRequest {
  email: string;
  password: string;
}

/** A student signs in with the code from their QR card; there is no email or password. */
export interface StudentLoginRequest {
  cardCode: string;
}

/** Accounts are created by the school; people only activate theirs with the invitation code. */
export interface ActivateRequest {
  inviteCode: string;
  password: string;
}

/**
 * `demo` means the form was validated but nothing was signed in or activated.
 * A real implementation will add its own result once the API contract exists.
 */
export interface AuthResult {
  mode: 'demo';
}

/** What the sign-in and activation screens may do; they depend only on this interface. */
export interface AuthService {
  login(request: LoginRequest): Promise<AuthResult>;
  loginWithCard(request: StudentLoginRequest): Promise<AuthResult>;
  activate(request: ActivateRequest): Promise<AuthResult>;
}

// No backend authentication or API contract exists yet, so the demo service is used.
// Replace it here once the backend developer provides the real endpoints.
export const authService: AuthService = demoAuthService;

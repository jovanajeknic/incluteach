/** Error codes the client itself makes up, next to the codes the server sends. */
export const NETWORK_ERROR = 'network_error';
export const UNKNOWN_ERROR = 'unknown_error';

/**
 * An error answer of the API (`{ error: { code, message } }`) or a failure to reach it.
 * Screens choose their Serbian text from `code`; `message` is English, for developers.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Sent as JSON. */
  body?: unknown;
  /** Sent as it is, for a file; the content type is left to the browser. */
  rawBody?: Blob;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

function toApiError(status: number, payload: unknown): ApiError {
  const error = (payload as { error?: Record<string, unknown> } | null)?.error;
  if (error && typeof error.code === 'string') {
    return new ApiError(
      status,
      error.code,
      typeof error.message === 'string' ? error.message : error.code,
      typeof error.details === 'object' && error.details !== null
        ? (error.details as Record<string, unknown>)
        : undefined,
    );
  }
  return new ApiError(status, UNKNOWN_ERROR, `Unexpected answer with status ${status}`);
}

/**
 * Calls the backend. Paths start with `/` and have no `/api`: the dev server forwards `/api`
 * to the backend and removes it. The session cookie is `httpOnly`, so the browser keeps it
 * and the code never reads it; `credentials: 'include'` makes sure it is always sent.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, rawBody, headers, signal } = options;

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
      body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
      signal,
    });
  } catch (error) {
    // An aborted request is not a failure of the network; let the caller see it as it is.
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, NETWORK_ERROR, 'The server could not be reached');
  }

  if (response.status === 204) return undefined as T;

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // An answer that is not JSON (for example from a broken proxy) is handled below.
  }

  if (!response.ok) throw toApiError(response.status, payload);
  return payload as T;
}

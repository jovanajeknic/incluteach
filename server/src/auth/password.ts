import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

export const MIN_PASSWORD_LENGTH = 7;
// An upper limit stops someone from making the server hash a huge text on every attempt.
export const MAX_PASSWORD_LENGTH = 128;

// Cost settings recommended by OWASP for scrypt (about 128 MiB of memory per hash).
// They are stored inside every hash, so they can be raised later without breaking old hashes.
const DEFAULT_COST = { N: 2 ** 17, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const FORMAT = 'scrypt';

export interface ScryptCost {
  N: number;
  r: number;
  p: number;
}

export type PasswordProblem = 'too_short' | 'too_long';

// The same letter can be typed as one character or as a base letter plus an accent
// (for example "č"). Normalising makes both forms give the same password.
function normalize(password: string): string {
  return password.normalize('NFKC');
}

export function checkPassword(password: string): PasswordProblem | null {
  const length = Array.from(normalize(password)).length;

  if (length < MIN_PASSWORD_LENGTH) {
    return 'too_short';
  }
  if (length > MAX_PASSWORD_LENGTH) {
    return 'too_long';
  }
  return null;
}

function deriveKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  cost: ScryptCost,
): Promise<Buffer> {
  const options: ScryptOptions = {
    ...cost,
    // Node refuses to use more memory than this, so it must be above 128 * N * r.
    maxmem: 128 * cost.N * cost.r * 2,
  };

  return new Promise((resolve, reject) => {
    scrypt(normalize(password), salt, keyLength, options, (error, key) => {
      if (error) {
        reject(error);
      } else {
        resolve(key);
      }
    });
  });
}

// Result looks like: scrypt$N$r$p$salt$hash (salt and hash in base64).
export async function hashPassword(
  password: string,
  cost: ScryptCost = DEFAULT_COST,
): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await deriveKey(password, salt, KEY_LENGTH, cost);

  return [FORMAT, cost.N, cost.r, cost.p, salt.toString('base64'), key.toString('base64')].join(
    '$',
  );
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split('$');
  if (parts.length !== 6 || parts[0] !== FORMAT) {
    return false;
  }

  const [N, r, p] = parts.slice(1, 4).map(Number);
  const salt = Buffer.from(parts[4], 'base64');
  const expected = Buffer.from(parts[5], 'base64');
  const validCost = [N, r, p].every((value) => Number.isInteger(value) && value > 0);
  if (!validCost || salt.length === 0 || expected.length === 0) {
    return false;
  }

  let actual: Buffer;
  try {
    actual = await deriveKey(password, salt, expected.length, { N, r, p });
  } catch {
    // For example a cost value scrypt does not accept (N must be a power of two).
    return false;
  }

  return timingSafeEqual(actual, expected);
}

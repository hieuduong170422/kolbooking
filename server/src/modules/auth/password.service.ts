import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keyLength: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SALT_BYTES = 16;
const SCHEME = 'scrypt';

/** Hash mật khẩu bằng scrypt (node:crypto) — định dạng "scrypt:<salt>:<hash>". */
export const hashPassword = async (plainPassword: string): Promise<string> => {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const derived = await scrypt(plainPassword, salt, KEY_LENGTH);
  return `${SCHEME}:${salt}:${derived.toString('hex')}`;
};

/** So sánh constant-time; hash sai định dạng trả về false thay vì throw. */
export const verifyPassword = async (
  plainPassword: string,
  storedHash: string,
): Promise<boolean> => {
  const [scheme, salt, hash] = storedHash.split(':');
  if (scheme !== SCHEME || !salt || !hash) return false;

  const derived = await scrypt(plainPassword, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === derived.length && timingSafeEqual(derived, expected);
};

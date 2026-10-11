import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * GOOGLE_TOKEN_ENCRYPTION_KEY is a 64-character hexadecimal string: 32 bytes,
 * lowercase or uppercase. It is read only when encrypting or decrypting.
 *
 * refreshTokenEnc uses this versioned text form:
 *   v1:<iv hex>:<auth tag hex>:<ciphertext hex>
 * The IV is 12 bytes, the authentication tag is 16 bytes, and the ciphertext
 * is AES-256-GCM over the UTF-8 refresh token.
 */

const KEY_ENV = 'GOOGLE_TOKEN_ENCRYPTION_KEY';
const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const MAX_CIPHERTEXT_BYTES = 4096;

const KEY_PATTERN = /^[0-9a-f]{64}$/i;
const PAYLOAD_PATTERN = /^v1:([0-9a-f]{24}):([0-9a-f]{32}):((?:[0-9a-f]{2})+)$/i;

function encryptionKey(): Buffer {
  const raw = process.env[KEY_ENV];
  if (!raw?.trim()) {
    throw new Error(`${KEY_ENV} is not set.`);
  }
  const hex = raw.trim();
  if (!KEY_PATTERN.test(hex)) {
    throw new Error(`${KEY_ENV} must be a 64-character hexadecimal string.`);
  }
  const key = Buffer.from(hex, 'hex');
  if (key.length !== KEY_BYTES) {
    throw new Error(`${KEY_ENV} must decode to 32 bytes.`);
  }
  return key;
}

function invalidPayload(): Error {
  return new Error('Encrypted token payload is invalid.');
}

export function encryptMeetRefreshToken(plaintext: string): string {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new Error('Refresh token is empty.');
  }
  const key = encryptionKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  if (tag.length !== TAG_BYTES || ciphertext.length === 0 || ciphertext.length > MAX_CIPHERTEXT_BYTES) {
    throw new Error('Encryption failed.');
  }
  return `${VERSION}:${iv.toString('hex')}:${tag.toString('hex')}:${ciphertext.toString('hex')}`;
}

export function decryptMeetRefreshToken(payload: string): string {
  if (typeof payload !== 'string') {
    throw invalidPayload();
  }
  const match = PAYLOAD_PATTERN.exec(payload.trim());
  if (!match) {
    throw invalidPayload();
  }
  const iv = Buffer.from(match[1], 'hex');
  const tag = Buffer.from(match[2], 'hex');
  const ciphertext = Buffer.from(match[3], 'hex');
  if (
    iv.length !== IV_BYTES ||
    tag.length !== TAG_BYTES ||
    ciphertext.length === 0 ||
    ciphertext.length > MAX_CIPHERTEXT_BYTES
  ) {
    throw invalidPayload();
  }

  const key = encryptionKey();
  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    if (!plaintext) {
      throw invalidPayload();
    }
    return plaintext;
  } catch (error) {
    if (error instanceof Error && error.message === 'Encrypted token payload is invalid.') {
      throw error;
    }
    throw new Error('Unable to decrypt the stored token.');
  }
}

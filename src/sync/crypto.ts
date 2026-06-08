import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';
import { getRandomBytes } from 'expo-crypto';

const KEY_LENGTH = 32;
const NONCE_LENGTH = 24;

export function generateKey(): string {
  const bytes = getRandomBytes(KEY_LENGTH);
  return encodeBase64(bytes);
}

export function encryptPayload(payload: object, keyBase64: string): string {
  const key = decodeBase64(keyBase64);
  const nonce = getRandomBytes(NONCE_LENGTH);
  const message = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = nacl.secretbox(message, nonce, key);
  if (!ciphertext) throw new Error('Encryption failed');

  const combined = new Uint8Array(NONCE_LENGTH + ciphertext.length);
  combined.set(nonce, 0);
  combined.set(ciphertext, NONCE_LENGTH);

  return encodeBase64(combined);
}

export function decryptPayload(encryptedBase64: string, keyBase64: string): object {
  const key = decodeBase64(keyBase64);
  const combined = decodeBase64(encryptedBase64);
  const nonce = combined.slice(0, NONCE_LENGTH);
  const ciphertext = combined.slice(NONCE_LENGTH);
  const decrypted = nacl.secretbox.open(ciphertext, nonce, key);
  if (!decrypted) throw new Error('Decryption failed (wrong key or corrupted data)');
  const text = new TextDecoder().decode(decrypted);
  return JSON.parse(text);
}

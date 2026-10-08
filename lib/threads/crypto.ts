import "server-only";

/**
 * AES-256-GCM encryption for Threads access tokens at rest.
 *
 * Uses the Web Crypto API (`crypto.subtle`) rather than Node's `crypto`
 * module so the code runs unchanged on Cloudflare Workers.
 *
 * Stored format: base64(iv) + "." + base64(ciphertext)
 * The 96-bit IV is random per encryption and prepended to the ciphertext.
 */

const ALGORITHM = "AES-GCM";
const IV_LENGTH_BYTES = 12;
const SEPARATOR = ".";

function getKeyMaterial(): string {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not set");
  }
  return key;
}

async function importKey(): Promise<CryptoKey> {
  const keyBytes = fromBase64(getKeyMaterial());
  return crypto.subtle.importKey("raw", keyBytes, { name: ALGORITHM }, false, [
    "encrypt",
    "decrypt",
  ]);
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const buf = Buffer.from(value, "base64");
  const bytes = new Uint8Array(buf.byteLength);
  bytes.set(buf);
  return bytes;
}

export async function encryptToken(plaintext: string): Promise<string> {
  const key = await importKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded,
  );

  return `${toBase64(iv)}${SEPARATOR}${toBase64(new Uint8Array(ciphertext))}`;
}

export async function decryptToken(stored: string): Promise<string> {
  const [ivPart, cipherPart] = stored.split(SEPARATOR);
  if (!ivPart || !cipherPart) {
    throw new Error("Malformed encrypted token");
  }

  const key = await importKey();
  const iv = fromBase64(ivPart);
  const ciphertext = fromBase64(cipherPart);

  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext,
  );

  return new TextDecoder().decode(plaintext);
}

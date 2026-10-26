import { beforeAll, describe, expect, it } from "vitest";
import { decryptToken, encryptToken } from "@/lib/threads/crypto";

const KEY = Buffer.alloc(32, 7).toString("base64");

beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = KEY;
});

describe("token encryption", () => {
  it("round-trips a token", async () => {
    const plaintext = "THREADS_LONG_LIVED_TOKEN_123";
    const stored = await encryptToken(plaintext);
    await expect(decryptToken(stored)).resolves.toBe(plaintext);
  });

  it("stores the iv and ciphertext as two base64 parts", async () => {
    const stored = await encryptToken("abc");
    const parts = stored.split(".");
    expect(parts).toHaveLength(2);
    expect(Buffer.from(parts[0], "base64")).toHaveLength(12);
    expect(parts[1].length).toBeGreaterThan(0);
  });

  it("produces a different ciphertext on every call", async () => {
    const a = await encryptToken("same input");
    const b = await encryptToken("same input");
    expect(a).not.toBe(b);
  });

  it("rejects a malformed payload", async () => {
    await expect(decryptToken("not-encrypted")).rejects.toThrow(
      "Malformed encrypted token",
    );
  });

  it("fails to decrypt a tampered ciphertext", async () => {
    const stored = await encryptToken("hello");
    const [iv, cipher] = stored.split(".");
    const tampered = `${iv}.${Buffer.from("garbage").toString("base64")}`;
    expect(cipher).not.toBe(tampered);
    await expect(decryptToken(tampered)).rejects.toThrow();
  });
});

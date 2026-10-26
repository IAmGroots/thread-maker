import "server-only";

/** Stable content fingerprint used to dedupe retried publish requests. */
export async function contentFingerprint(segments: string[]): Promise<string> {
  const bytes = new TextEncoder().encode(segments.join("\n"));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/**
 * One scheduled slot is identified by its content, account, media, and time, so
 * a retried request resolves to the same target instead of creating a
 * duplicate. Media is part of the key: the same text with a different image is
 * a different post.
 */
export function scheduleIdempotencyKey(
  fingerprint: string,
  accountId: string,
  scheduledFor: string,
  mediaId?: string,
): string {
  return `${fingerprint}:${accountId}:${scheduledFor}:${mediaId ?? "no-media"}`;
}

/**
 * Publish-now uses the request id generated when the dialog opens. Without one
 * (older clients), fall back to a one-minute bucket: a double click or a
 * network retry dedupes, while a deliberate repost later still works.
 */
export function publishNowIdempotencyKey(
  fingerprint: string,
  accountId: string,
  requestId?: string,
  mediaId?: string,
): string {
  if (requestId) return `now:${requestId}:${accountId}:${mediaId ?? "no-media"}`;
  const minuteBucket = Math.floor(Date.now() / 60_000);
  return `now:${fingerprint}:${accountId}:${minuteBucket}:${mediaId ?? "no-media"}`;
}

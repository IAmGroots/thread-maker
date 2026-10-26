"use client";

export interface TargetStatusPayload {
  success: boolean;
  status: string;
  targetId: string;
  publishedCount: number;
  total: number | null;
  failedAtIndex: number | null;
  primaryPostId: string | null;
  postUrl: string | null;
  error: string | null;
  attempts: number;
  done: boolean;
}

export interface PollOptions {
  intervalMs?: number;
  timeoutMs?: number;
  onProgress?: (payload: TargetStatusPayload) => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Follow a queued target until the worker finishes. Returns null when the wait
 * runs out, which means "still publishing", not "failed".
 */
export async function pollTargetStatus(
  targetId: string,
  options: PollOptions = {},
): Promise<TargetStatusPayload | null> {
  const intervalMs = options.intervalMs ?? 2000;
  const timeoutMs = options.timeoutMs ?? 3 * 60 * 1000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    await sleep(intervalMs);

    try {
      const response = await fetch(`/api/targets/${targetId}`);
      if (!response.ok) continue;

      const payload = (await response.json()) as TargetStatusPayload;
      if (typeof payload.status !== "string") continue;

      options.onProgress?.(payload);
      if (payload.done) return payload;
    } catch {
      // A dropped poll is fine; the next tick retries.
    }
  }

  return null;
}

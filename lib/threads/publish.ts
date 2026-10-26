import "server-only";

import { MAX_CHAIN_LENGTH, MAX_POST_CHARS } from "@/lib/threads/limits";
import { fetchWithTimeout } from "@/lib/http/fetchTimeout";

export { MAX_CHAIN_LENGTH, MAX_POST_CHARS };

/**
 * Threads publishing helpers.
 *
 * Publishing a thread is a two-step, per-post process:
 *   1. POST /me/threads        -> create a media container for the text.
 *   2. POST /me/threads_publish-> publish that container, returning a post id.
 *
 * A thread is a reply chain: post 1 is published first, then each following
 * post is created with `reply_to_id` set to the previous post id. We publish
 * strictly in order so the chain never breaks and no post is skipped.
 *
 * Threads processes containers asynchronously and rate-limits rapid publishing,
 * so between posts we (a) wait for the container to report ready, (b) pause a
 * fixed gap, and (c) retry transient failures with backoff. Without these, only
 * the first post of a thread tends to succeed.
 *
 * Docs: https://developers.facebook.com/docs/threads
 */

const THREADS_GRAPH_URL = "https://graph.threads.net/v1.0";

// Container processing is asynchronous on Meta's side; poll until ready.
const CONTAINER_POLL_INTERVAL_MS = 1500;
const CONTAINER_POLL_MAX_ATTEMPTS = 20; // up to ~30s per container
// Minimum pause after a successful publish before creating the next container.
// Threads throttles rapid back-to-back publishing.
const INTER_POST_DELAY_MS = 3000;
// Retry policy for transient API failures (rate limit, 5xx, container not ready).
const MAX_RETRIES = 4;
const RETRY_BASE_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ThreadsApiError {
  error?: { message?: string; type?: string; code?: number; error_subcode?: number };
}

async function readError(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const json = JSON.parse(text) as ThreadsApiError;
    if (json.error?.message) return json.error.message;
  } catch {
    // fall through to raw text
  }
  return text;
}

/** A failure that is worth retrying (rate limit, transient server error). */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * A 403 with a permission message usually means the stored token was granted
 * before the app requested a scope it now needs (e.g. threads_manage_replies for
 * replies). The fix is for the user to reconnect the account.
 */
export function isPermissionError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("does not have permission") ||
    lower.includes("permission for this action") ||
    lower.includes("insufficient permission")
  );
}

export async function createContainer(
  accessToken: string,
  text: string,
  replyToId?: string,
  imageUrl?: string,
): Promise<string> {
  const body = new URLSearchParams({
    access_token: accessToken,
    text,
  });

  if (imageUrl) {
    body.set("media_type", "IMAGE");
    body.set("image_url", imageUrl);
  } else {
    body.set("media_type", "TEXT");
  }

  if (replyToId) body.set("reply_to_id", replyToId);

  const response = await fetchWithTimeout(`${THREADS_GRAPH_URL}/me/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const detail = await readError(response);
    const error = new Error(`Threads create container failed (${response.status}): ${detail}`);
    (error as Error & { retryable?: boolean }).retryable = isRetryableStatus(response.status);
    throw error;
  }

  const json = (await response.json()) as { id: string };
  return json.id;
}

interface ContainerStatus {
  status?: string;
  error_message?: string;
}

/**
 * Poll a container until it is ready to publish.
 *
 * Returns once the container reports FINISHED/PUBLISHED and throws on ERROR or
 * EXPIRED. If the status endpoint never returns a usable status (some accounts
 * do not expose it), it waits one extra interval and returns, so the publish
 * attempt itself decides. If a status was reported but never reached a ready
 * state, that is a real timeout and is surfaced as an error.
 */
export async function waitForContainer(
  accessToken: string,
  containerId: string,
): Promise<void> {
  let sawStatus = false;
  let lastStatus: string | undefined;

  for (let attempt = 0; attempt < CONTAINER_POLL_MAX_ATTEMPTS; attempt++) {
    const params = new URLSearchParams({
      fields: "status,error_message",
      access_token: accessToken,
    });

    const response = await fetchWithTimeout(
      `${THREADS_GRAPH_URL}/${containerId}?${params.toString()}`,
    );

    if (response.ok) {
      const json = (await response.json()) as ContainerStatus;
      const status = json.status?.toUpperCase();
      if (status) {
        sawStatus = true;
        lastStatus = status;
      }

      if (status === "FINISHED" || status === "PUBLISHED") return;
      if (status === "ERROR" || status === "EXPIRED") {
        throw new Error(`Threads container error: ${json.error_message ?? "unknown"}`);
      }
    }

    await sleep(CONTAINER_POLL_INTERVAL_MS);
  }

  if (!sawStatus) {
    // No status signal at all: give the container a moment and let the publish
    // call be the judge.
    await sleep(CONTAINER_POLL_INTERVAL_MS);
    return;
  }

  throw new Error(
    `Threads container ${containerId} did not become ready (last status: ${lastStatus ?? "unknown"}).`,
  );
}

export async function publishContainer(
  accessToken: string,
  containerId: string,
): Promise<string> {
  const body = new URLSearchParams({
    creation_id: containerId,
    access_token: accessToken,
  });

  const response = await fetchWithTimeout(`${THREADS_GRAPH_URL}/me/threads_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const detail = await readError(response);
    const error = new Error(`Threads publish failed (${response.status}): ${detail}`);
    (error as Error & { retryable?: boolean }).retryable = isRetryableStatus(response.status);
    throw error;
  }

  const json = (await response.json()) as { id: string };
  return json.id;
}

function isRetryable(error: unknown): boolean {
  if (error && typeof error === "object" && "retryable" in error) {
    return Boolean((error as { retryable?: boolean }).retryable);
  }
  // Network errors and request timeouts are worth retrying too.
  if (error instanceof TypeError) return true;
  if (error instanceof Error) {
    return error.name === "AbortError" || error.name === "TimeoutError";
  }
  return false;
}

/** Run an operation with exponential backoff on retryable failures. */
async function withRetry<T>(operation: () => Promise<T>, label: string): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === MAX_RETRIES || !isRetryable(error)) throw error;
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(`[threads] ${label} failed, retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`);
      await sleep(delay);
    }
  }
  throw lastError;
}

export type PublishStatus = "published" | "partial_published" | "failed";

export interface PublishChainResult {
  status: PublishStatus;
  publishedCount: number;
  total: number;
  postIds: string[];
  failedAtIndex: number | null;
  error?: string;
}

export interface ChainOptions {
  /** Index to resume from, after a partial failure. */
  startIndex?: number;
  /** Post id to reply to when resuming. */
  replyToId?: string;
  /** Image for the first post of the chain. */
  imageUrl?: string;
  /** Called after each published post so progress survives a crash. */
  onProgress?: (index: number, postId: string) => Promise<void>;
}

/**
 * Publish an ordered list of tweets as a reply chain.
 *
 * Stops at the first unrecoverable failure and reports the index, so the caller
 * can record a partial publish and the user knows exactly where it broke. Never
 * publishes a post out of order (each create waits for the previous post id).
 */
export async function publishThreadChain(
  accessToken: string,
  tweets: string[],
  options: ChainOptions = {},
): Promise<PublishChainResult> {
  const total = tweets.length;
  const startIndex = options.startIndex ?? 0;
  const postIds: string[] = [];
  let previousPostId = options.replyToId;

  for (let i = startIndex; i < total; i++) {
    try {
      const containerId = await withRetry(
        () =>
          createContainer(
            accessToken,
            tweets[i],
            previousPostId,
            i === 0 ? options.imageUrl : undefined,
          ),
        `createContainer(${i + 1})`,
      );

      await waitForContainer(accessToken, containerId);

      const postId = await withRetry(
        () => publishContainer(accessToken, containerId),
        `publishContainer(${i + 1})`,
      );

      postIds.push(postId);
      previousPostId = postId;

      if (options.onProgress) {
        await options.onProgress(i, postId);
      }

      // Pause before the next post so Threads does not throttle the chain.
      if (i < total - 1) {
        await sleep(INTER_POST_DELAY_MS);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[threads] publish chain stopped at post ${i + 1}/${total}:`, message);
      return {
        status: postIds.length > 0 ? "partial_published" : "failed",
        publishedCount: postIds.length,
        total,
        postIds,
        failedAtIndex: i,
        error: message,
      };
    }
  }

  return {
    status: "published",
    publishedCount: postIds.length,
    total,
    postIds,
    failedAtIndex: null,
  };
}

export { THREADS_GRAPH_URL };

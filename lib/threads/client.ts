import "server-only";
import { exchangeForLongLivedToken, computeTokenExpiry } from "./oauth";

const THREADS_GRAPH_URL = "https://graph.threads.net/v1.0";
const THREADS_REFRESH_URL = "https://graph.threads.net/refresh_access_token";

export interface RefreshedToken {
  accessToken: string;
  expiresAt: string;
}

/**
 * Refresh a long-lived Threads token. Meta allows refreshing a token that is at
 * least 24 hours old and not yet expired; the refreshed token lasts ~60 days.
 */
export async function refreshLongLivedToken(
  currentToken: string,
): Promise<RefreshedToken> {
  const params = new URLSearchParams({
    grant_type: "th_refresh_token",
    access_token: currentToken,
  });

  const response = await fetch(`${THREADS_REFRESH_URL}?${params.toString()}`);

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Threads token refresh failed (${response.status}): ${detail}`);
  }

  const json = (await response.json()) as { access_token: string; expires_in: number };
  return {
    accessToken: json.access_token,
    expiresAt: computeTokenExpiry(json.expires_in),
  };
}

/**
 * Ensure a token is fresh: refresh when it expires within `thresholdDays`.
 * Returns the (possibly new) token and its expiry, or the originals when the
 * token is still comfortably valid.
 */
export async function ensureFreshToken(
  currentToken: string,
  expiresAt: string | null,
  thresholdDays = 7,
): Promise<RefreshedToken> {
  if (!expiresAt) {
    return { accessToken: currentToken, expiresAt: "" };
  }

  const expiresAtMs = new Date(expiresAt).getTime();
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;

  if (Number.isNaN(expiresAtMs) || expiresAtMs - Date.now() > thresholdMs) {
    return { accessToken: currentToken, expiresAt };
  }

  return refreshLongLivedToken(currentToken);
}

export { THREADS_GRAPH_URL };

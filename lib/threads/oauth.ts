import "server-only";

/**
 * Threads OAuth (Meta) helpers.
 *
 * Flow:
 *   1. Redirect the user to `threads.net/oauth/authorize` with a CSRF `state`.
 *   2. Meta redirects back with `?code=...`; exchange it for a short-lived token.
 *   3. Exchange the short-lived token for a long-lived token (~60 days).
 *   4. Fetch the Threads profile (`/me`) and persist id, username, token.
 *
 * Docs: https://developers.facebook.com/docs/threads
 */

const THREADS_AUTHORIZE_URL = "https://threads.net/oauth/authorize";
const THREADS_TOKEN_URL = "https://graph.threads.net/oauth/access_token";
const THREADS_LONG_LIVED_TOKEN_URL = "https://graph.threads.net/access_token";
const THREADS_GRAPH_URL = "https://graph.threads.net/v1.0";

export const THREADS_SCOPES = [
  "threads_basic",
  "threads_content_publish",
] as const;

export const THREADS_STATE_COOKIE = "threads_oauth_state";

export function getThreadsConfig() {
  const appId = process.env.THREADS_APP_ID;
  const appSecret = process.env.THREADS_APP_SECRET;
  const redirectUri = process.env.THREADS_REDIRECT_URI;

  if (!appId || !appSecret || !redirectUri) {
    throw new Error(
      "Threads OAuth is not configured (THREADS_APP_ID, THREADS_APP_SECRET, THREADS_REDIRECT_URI)",
    );
  }

  return { appId, appSecret, redirectUri };
}

export function buildAuthorizeUrl(state: string): string {
  const { appId, redirectUri } = getThreadsConfig();
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: THREADS_SCOPES.join(","),
    response_type: "code",
    state,
  });
  return `${THREADS_AUTHORIZE_URL}?${params.toString()}`;
}

interface ShortLivedTokenResponse {
  access_token: string;
  user_id: string | number;
}

export async function exchangeCodeForToken(
  code: string,
): Promise<ShortLivedTokenResponse> {
  const { appId, appSecret, redirectUri } = getThreadsConfig();

  const body = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(THREADS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Threads token exchange failed (${response.status}): ${detail}`);
  }

  return (await response.json()) as ShortLivedTokenResponse;
}

interface LongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export async function exchangeForLongLivedToken(
  shortLivedToken: string,
): Promise<LongLivedTokenResponse> {
  const { appSecret } = getThreadsConfig();

  const params = new URLSearchParams({
    grant_type: "th_exchange_token",
    client_secret: appSecret,
    access_token: shortLivedToken,
  });

  const response = await fetch(`${THREADS_LONG_LIVED_TOKEN_URL}?${params.toString()}`, {
    method: "GET",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Threads long-lived exchange failed (${response.status}): ${detail}`);
  }

  return (await response.json()) as LongLivedTokenResponse;
}

interface ThreadsProfile {
  id: string;
  username: string;
}

export async function fetchThreadsProfile(
  accessToken: string,
): Promise<ThreadsProfile> {
  const params = new URLSearchParams({
    fields: "id,username",
    access_token: accessToken,
  });

  const response = await fetch(`${THREADS_GRAPH_URL}/me?${params.toString()}`);

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Threads profile fetch failed (${response.status}): ${detail}`);
  }

  const json = (await response.json()) as { id: string; username: string };
  return { id: json.id, username: json.username };
}

export function computeTokenExpiry(expiresInSeconds: number): string {
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}

/**
 * `fetch` with a hard timeout. External social APIs can hang, and a worker that
 * never returns holds its lease until another worker reclaims the target.
 */
export function fetchWithTimeout(
  input: string | URL,
  init: RequestInit = {},
  timeoutMs = 20_000,
): Promise<Response> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = init.signal ?? timeout;

  return fetch(input, { ...init, signal });
}

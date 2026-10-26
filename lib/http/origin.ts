import type { NextRequest } from "next/server";

/**
 * Build the public origin of the incoming request.
 *
 * Behind a proxy, tunnel (ngrok, Cloudflare), or platform router, Next.js may
 * report `request.url` with an internal host (e.g. `localhost:3001`) instead of
 * the public one. Trusting `request.url` there makes OAuth callbacks redirect
 * to the wrong host.
 *
 * Order of preference:
 *   1. `NEXT_PUBLIC_APP_URL`, the canonical origin. Set this in production.
 *   2. `X-Forwarded-Host` + `X-Forwarded-Proto` (set by the proxy to the public
 *      host), after rejecting values that could break out of the authority.
 *   3. The `Host` header with a scheme inferred from `X-Forwarded-Proto`.
 *   4. `request.nextUrl.origin` as a last resort.
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || "";

/** Reject hosts that contain a path, credentials, or whitespace. */
function sanitizeHost(value: string): string | null {
  const host = value.split(",")[0].trim();
  if (!host) return null;
  if (/[/\\@\s]/.test(host)) return null;
  return host;
}

export function getRequestOrigin(request: NextRequest): string {
  if (APP_URL) {
    try {
      return new URL(APP_URL).origin;
    } catch {
      // Fall through to the request headers.
    }
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (forwardedHost) {
    const host = sanitizeHost(forwardedHost);
    const proto = forwardedProto?.split(",")[0].trim() || "https";
    if (host) return `${proto}://${host}`;
  }

  const host = sanitizeHost(request.headers.get("host") ?? "");
  if (host) {
    const proto =
      forwardedProto?.split(",")[0].trim() ||
      request.nextUrl.protocol.replace(":", "") ||
      "https";
    return `${proto}://${host}`;
  }

  return request.nextUrl.origin;
}

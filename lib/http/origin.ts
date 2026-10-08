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
 *   1. `X-Forwarded-Host` + `X-Forwarded-Proto` (set by the proxy to the public
 *      host). The first entry wins when the header carries a comma list.
 *   2. The `Host` header with a scheme inferred from `X-Forwarded-Proto`.
 *   3. `request.nextUrl.origin` as a last resort.
 */
export function getRequestOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (forwardedHost) {
    const host = forwardedHost.split(",")[0].trim();
    const proto = forwardedProto?.split(",")[0].trim() || "https";
    if (host) return `${proto}://${host}`;
  }

  const host = request.headers.get("host");
  if (host) {
    const proto = forwardedProto?.split(",")[0].trim() || request.nextUrl.protocol.replace(":", "") || "https";
    return `${proto}://${host}`;
  }

  return request.nextUrl.origin;
}

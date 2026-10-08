import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Which proxy header (if any) is trusted to carry the real client IP.
 *
 * Only set this when the app genuinely sits behind a proxy that overwrites the
 * header (e.g. "cf-connecting-ip" behind Cloudflare, "x-real-ip" behind nginx,
 * "x-vercel-forwarded-for" on Vercel). Left unset, we trust nothing and fall
 * back to x-forwarded-for's nearest hop — otherwise an attacker can spoof the
 * IP per request and defeat the rate limiter.
 */
const TRUSTED_IP_HEADER = process.env.TRUSTED_IP_HEADER?.trim().toLowerCase() || "";

type HeaderKey =
  | "cf-connecting-ip"
  | "x-real-ip"
  | "x-vercel-forwarded-for"
  | "x-forwarded-for";

const IP_HEADER_EXTRACTORS: Record<HeaderKey, (value: string) => string> = {
  "cf-connecting-ip": (v) => v.trim(),
  "x-real-ip": (v) => v.trim(),
  // Proxies may append their own hop; the client is the first entry.
  "x-vercel-forwarded-for": (v) => v.split(",")[0].trim(),
  "x-forwarded-for": (v) => {
    const parts = v.split(",").map((p) => p.trim()).filter(Boolean);
    // Nearest hop to this server, to avoid client-prepended spoofed entries.
    return parts.length > 0 ? parts[parts.length - 1] : "";
  },
};

function getClientIp(request: NextRequest): string {
  if (TRUSTED_IP_HEADER in IP_HEADER_EXTRACTORS) {
    const raw = request.headers.get(TRUSTED_IP_HEADER);
    if (raw) {
      const ip = IP_HEADER_EXTRACTORS[TRUSTED_IP_HEADER as HeaderKey](raw);
      if (ip) return ip;
    }
  }

  // Without a configured trusted proxy, fall back to the connection's nearest
  // hop only. This is still spoofable unless a proxy overwrites XFF, so the
  // rate limiter stays a best-effort control until TRUSTED_IP_HEADER is set.
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = IP_HEADER_EXTRACTORS["x-forwarded-for"](forwarded);
    if (ip) return ip;
  }

  return "127.0.0.1";
}

function isAllowedOrigin(request: NextRequest): boolean {
  if (request.method === "GET" || request.method === "HEAD") {
    return true;
  }

  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite && secFetchSite === "cross-site") {
    return false;
  }

  const host = request.headers.get("host");
  if (!host) return false;

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  // Allow same-origin requests in development without origin/referer (e.g. tools/curl)
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  return false;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Refresh Supabase auth session on every request so cookies stay fresh.
  // Must run before any response is returned so Set-Cookie headers propagate.
  const response = NextResponse.next();
  await updateSession(request, response);

  if (pathname.startsWith("/api/")) {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Request origin is not permitted.",
        },
        { status: 403 },
      );
    }

    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(ip, pathname);

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many requests. Please wait a moment before trying again.",
          retryAfter: rateLimit.resetSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.resetSeconds),
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rateLimit.resetSeconds),
          },
        },
      );
    }

    response.headers.set("X-RateLimit-Limit", String(rateLimit.limit));
    response.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
    response.headers.set("X-RateLimit-Reset", String(rateLimit.resetSeconds));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

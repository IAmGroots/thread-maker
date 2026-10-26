/**
 * Only internal absolute paths are allowed as a post-login destination.
 * `next=@evil.com` and `next=//evil.com` would otherwise redirect off-site.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/";
  }

  try {
    const url = new URL(next, "https://app.local");
    if (url.origin !== "https://app.local") return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

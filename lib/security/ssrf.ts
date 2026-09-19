import dns from "node:dns/promises";
import net from "node:net";

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true;
    }
    const [b0, b1] = parts;
    if (b0 === 0) return true;
    if (b0 === 10) return true;
    if (b0 === 127) return true;
    if (b0 === 169 && b1 === 254) return true;
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
    if (b0 === 192 && b1 === 168) return true;
    if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;
    if (b0 >= 224) return true;
    return false;
  }

  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    if (normalized === "::1" || normalized === "::") return true;
    if (normalized.startsWith("::ffff:")) {
      const ipv4Part = normalized.slice(7);
      return isPrivateIp(ipv4Part);
    }
    if (
      normalized.startsWith("fe80:") ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd")
    ) {
      return true;
    }
    return false;
  }

  return true;
}

export async function assertSafeUrl(urlString: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error("Invalid URL format.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Invalid URL protocol. Only HTTP and HTTPS are permitted.");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "metadata.google.internal"
  ) {
    throw new Error("Access to local or internal network is prohibited.");
  }

  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error("Access to private IP addresses is prohibited.");
    }
    return parsed;
  }

  const addresses = await dns.lookup(hostname, { all: true });
  if (!addresses || addresses.length === 0) {
    throw new Error("Could not resolve host IP.");
  }

  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      throw new Error(
        "Host resolves to a private or restricted network address."
      );
    }
  }

  return parsed;
}

export async function isSafeUrl(urlString: string): Promise<boolean> {
  try {
    await assertSafeUrl(urlString);
    return true;
  } catch {
    return false;
  }
}

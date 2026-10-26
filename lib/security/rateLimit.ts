import "server-only";

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  "/api/generate": { limit: 5, windowMs: 60 * 1000 },
  "/api/transform": { limit: 10, windowMs: 60 * 1000 },
  "/api/adjust-length": { limit: 10, windowMs: 60 * 1000 },
  "/api/regenerate-tweet": { limit: 10, windowMs: 60 * 1000 },
  "/api/suggest-topics": { limit: 5, windowMs: 60 * 1000 },
  "/api/analytics:sync": { limit: 3, windowMs: 5 * 60 * 1000 },
};

/**
 * Fail-closed default for any /api route NOT listed in RATE_LIMIT_CONFIGS.
 * Unknown (possibly new AI) endpoints get a stricter budget than the known
 * cheap ones, so a forgotten registration cannot leave a hole.
 */
const DEFAULT_RATE_LIMIT: RateLimitConfig = { limit: 5, windowMs: 60 * 1000 };

/**
 * Per-IP budgets sit above the per-user budgets because several people can
 * share one address (office, campus, mobile carrier NAT). The per-user limit
 * in the route handler is the one that protects AI cost.
 */
export const IP_RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  "/api/generate": { limit: 20, windowMs: 60 * 1000 },
  "/api/transform": { limit: 40, windowMs: 60 * 1000 },
  "/api/adjust-length": { limit: 40, windowMs: 60 * 1000 },
  "/api/regenerate-tweet": { limit: 40, windowMs: 60 * 1000 },
  "/api/suggest-topics": { limit: 20, windowMs: 60 * 1000 },
};

const DEFAULT_IP_RATE_LIMIT: RateLimitConfig = { limit: 40, windowMs: 60 * 1000 };

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL?.trim() || "";
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || "";
const UPSTASH_TIMEOUT_MS = 1500;

interface RateLimitRecord {
  timestamps: number[];
}

const memoryStore = new Map<string, RateLimitRecord>();
const CLEANUP_INTERVAL_MS = 60 * 1000;
let lastCleanup = 0;

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const maxWindow = Math.max(
    DEFAULT_RATE_LIMIT.windowMs,
    DEFAULT_IP_RATE_LIMIT.windowMs,
    ...Object.values(RATE_LIMIT_CONFIGS).map((config) => config.windowMs),
    ...Object.values(IP_RATE_LIMIT_CONFIGS).map((config) => config.windowMs),
  );

  memoryStore.forEach((record, key) => {
    const valid = record.timestamps.filter((ts) => now - ts < maxWindow);
    if (valid.length === 0) {
      memoryStore.delete(key);
    } else {
      record.timestamps = valid;
    }
  });
}

function checkInMemory(
  identifier: string,
  pathname: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();
  cleanup(now);

  const key = `${identifier}:${pathname}`;
  const record = memoryStore.get(key) ?? { timestamps: [] };
  const valid = record.timestamps.filter((ts) => now - ts < config.windowMs);

  if (valid.length >= config.limit) {
    const resetMs = valid[0] + config.windowMs - now;
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetSeconds: Math.max(1, Math.ceil(resetMs / 1000)),
    };
  }

  valid.push(now);
  memoryStore.set(key, { timestamps: valid });

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - valid.length,
    resetSeconds: Math.max(1, Math.ceil(config.windowMs / 1000)),
  };
}

async function runUpstashPipeline(
  commands: unknown[][],
): Promise<Array<{ result?: unknown; error?: string }>> {
  const response = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(UPSTASH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Upstash returned ${response.status}`);
  }

  return (await response.json()) as Array<{ result?: unknown; error?: string }>;
}

/**
 * Sliding window in Redis. The counter is shared across isolates, which the
 * in-memory fallback cannot do on Cloudflare Workers.
 */
async function checkUpstash(
  identifier: string,
  pathname: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const key = `rl:${pathname}:${identifier}`;
  const member = `${now}-${Math.random().toString(36).slice(2, 8)}`;

  const results = await runUpstashPipeline([
    ["ZREMRANGEBYSCORE", key, 0, windowStart],
    ["ZADD", key, now, member],
    ["ZCARD", key],
    ["PEXPIRE", key, config.windowMs],
  ]);

  const failed = results.find((entry) => entry.error);
  if (failed) {
    throw new Error(failed.error);
  }

  const count = Number(results[2]?.result ?? 0);
  const remaining = Math.max(0, config.limit - count);

  return {
    success: count <= config.limit,
    limit: config.limit,
    remaining,
    resetSeconds: Math.max(1, Math.ceil(config.windowMs / 1000)),
  };
}

/**
 * Consume one request from the bucket for `identifier` on `pathname`.
 * Uses the shared Redis store when configured, otherwise falls back to a
 * per-instance counter. A Redis failure also falls back, so a store outage
 * degrades protection instead of taking the app down.
 */
async function consume(
  scope: "user" | "ip",
  identifier: string,
  pathname: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      return await checkUpstash(`${scope}:${identifier}`, pathname, config);
    } catch {
      return checkInMemory(`${scope}:${identifier}`, pathname, config);
    }
  }

  return checkInMemory(`${scope}:${identifier}`, pathname, config);
}

/** Per-user budget, enforced inside the route handler. */
export async function checkRateLimit(
  identifier: string,
  pathname: string,
): Promise<RateLimitResult> {
  return consume(
    "user",
    identifier,
    pathname,
    RATE_LIMIT_CONFIGS[pathname] ?? DEFAULT_RATE_LIMIT,
  );
}

/** Coarse per-IP budget, enforced in middleware as an anti-abuse backstop. */
export async function checkIpRateLimit(
  ip: string,
  pathname: string,
): Promise<RateLimitResult> {
  return consume(
    "ip",
    ip,
    pathname,
    IP_RATE_LIMIT_CONFIGS[pathname] ?? DEFAULT_IP_RATE_LIMIT,
  );
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetSeconds),
  };
}

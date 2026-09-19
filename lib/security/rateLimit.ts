// In-memory sliding window rate limiter
interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up stale entries every 60 seconds
const CLEANUP_INTERVAL = 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  const maxWindow = 60 * 1000;
  rateLimitStore.forEach((record, key) => {
    const validTimestamps = record.timestamps.filter((ts) => now - ts < maxWindow);
    if (validTimestamps.length === 0) {
      rateLimitStore.delete(key);
    } else {
      record.timestamps = validTimestamps;
    }
  });
}

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
  "/api/generate": {
    limit: 5, // 5 requests per minute
    windowMs: 60 * 1000,
  },
  "/api/transform": {
    limit: 10, // 10 requests per minute
    windowMs: 60 * 1000,
  },
  "/api/adjust-length": {
    limit: 10, // 10 requests per minute
    windowMs: 60 * 1000,
  },
  "/api/regenerate-tweet": {
    limit: 10, // 10 requests per minute
    windowMs: 60 * 1000,
  },
  "/api/affiliate/resolve": {
    limit: 15,
    windowMs: 60 * 1000,
  },
};

export function checkRateLimit(
  ip: string,
  pathname: string,
): RateLimitResult {
  cleanup();

  const config = RATE_LIMIT_CONFIGS[pathname] || {
    limit: 10,
    windowMs: 60 * 1000,
  };

  const key = `${ip}:${pathname}`;
  const now = Date.now();
  const record = rateLimitStore.get(key) || { timestamps: [] };

  // Remove timestamps outside the current window
  const validTimestamps = record.timestamps.filter(
    (ts) => now - ts < config.windowMs,
  );

  if (validTimestamps.length >= config.limit) {
    const oldestTimestamp = validTimestamps[0];
    const resetMs = oldestTimestamp + config.windowMs - now;
    const resetSeconds = Math.max(1, Math.ceil(resetMs / 1000));

    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetSeconds,
    };
  }

  validTimestamps.push(now);
  rateLimitStore.set(key, { timestamps: validTimestamps });

  const oldestTimestamp = validTimestamps[0];
  const resetMs = oldestTimestamp + config.windowMs - now;
  const resetSeconds = Math.max(1, Math.ceil(resetMs / 1000));

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - validTimestamps.length,
    resetSeconds,
  };
}

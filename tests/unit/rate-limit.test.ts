import { describe, expect, it } from "vitest";
import {
  checkIpRateLimit,
  checkRateLimit,
  rateLimitHeaders,
} from "@/lib/security/rateLimit";

describe("checkRateLimit (in-memory fallback)", () => {
  it("allows requests up to the configured limit", async () => {
    const id = `user-${Math.random()}`;

    for (let i = 0; i < 5; i++) {
      const result = await checkRateLimit(id, "/api/generate");
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4 - i);
    }
  });

  it("blocks the request after the limit", async () => {
    const id = `user-${Math.random()}`;

    for (let i = 0; i < 5; i++) {
      await checkRateLimit(id, "/api/generate");
    }

    const blocked = await checkRateLimit(id, "/api/generate");
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetSeconds).toBeGreaterThan(0);
  });

  it("keeps budgets separate per identifier", async () => {
    const first = `user-${Math.random()}`;
    const second = `user-${Math.random()}`;

    for (let i = 0; i < 5; i++) {
      await checkRateLimit(first, "/api/generate");
    }

    await expect(checkRateLimit(first, "/api/generate")).resolves.toMatchObject({
      success: false,
    });
    await expect(checkRateLimit(second, "/api/generate")).resolves.toMatchObject({
      success: true,
    });
  });

  it("keeps budgets separate per route", async () => {
    const id = `user-${Math.random()}`;

    for (let i = 0; i < 5; i++) {
      await checkRateLimit(id, "/api/suggest-topics");
    }

    await expect(checkRateLimit(id, "/api/suggest-topics")).resolves.toMatchObject({
      success: false,
    });
    await expect(checkRateLimit(id, "/api/transform")).resolves.toMatchObject({
      success: true,
    });
  });

  it("applies the fail-closed default to unknown routes", async () => {
    const id = `user-${Math.random()}`;

    for (let i = 0; i < 5; i++) {
      await checkRateLimit(id, "/api/unknown");
    }

    const blocked = await checkRateLimit(id, "/api/unknown");
    expect(blocked.success).toBe(false);
    expect(blocked.limit).toBe(5);
  });
});

describe("checkIpRateLimit", () => {
  it("gives an IP a larger budget than a single user", async () => {
    const ip = `10.0.0.${Math.floor(Math.random() * 250)}`;

    for (let i = 0; i < 20; i++) {
      const result = await checkIpRateLimit(ip, "/api/generate");
      expect(result.success).toBe(true);
    }

    const blocked = await checkIpRateLimit(ip, "/api/generate");
    expect(blocked.success).toBe(false);
    expect(blocked.limit).toBe(20);
  });
});

describe("rateLimitHeaders", () => {
  it("exposes the limit state as headers", () => {
    expect(
      rateLimitHeaders({ success: true, limit: 10, remaining: 7, resetSeconds: 60 }),
    ).toEqual({
      "X-RateLimit-Limit": "10",
      "X-RateLimit-Remaining": "7",
      "X-RateLimit-Reset": "60",
    });
  });
});

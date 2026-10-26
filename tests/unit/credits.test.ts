import { describe, expect, it } from "vitest";
import {
  canConsume,
  limitForMetric,
  PLAN_LIMITS,
  PLAN_PRICES_IDR,
  remainingForMetric,
} from "@/lib/billing/credits";

describe("plan limits", () => {
  it("prices increase with the plan", () => {
    expect(PLAN_PRICES_IDR.free).toBe(0);
    expect(PLAN_PRICES_IDR.starter).toBe(49_000);
    expect(PLAN_PRICES_IDR.creator).toBe(89_000);
    expect(PLAN_PRICES_IDR.pro).toBe(149_000);
  });

  it("every paid plan allows more posts than the previous one", () => {
    expect(PLAN_LIMITS.starter.scheduledPostsPerMonth).toBeGreaterThan(
      PLAN_LIMITS.free.scheduledPostsPerMonth,
    );
    expect(PLAN_LIMITS.creator.scheduledPostsPerMonth).toBeGreaterThan(
      PLAN_LIMITS.starter.scheduledPostsPerMonth,
    );
    expect(PLAN_LIMITS.pro.scheduledPostsPerMonth).toBeGreaterThan(
      PLAN_LIMITS.creator.scheduledPostsPerMonth,
    );
  });

  it("maps each metric to its limit", () => {
    expect(limitForMetric("free", "scheduled_posts")).toBe(10);
    expect(limitForMetric("free", "ai_credits")).toBe(30);
    expect(limitForMetric("free", "storage_bytes")).toBe(100 * 1024 * 1024);
  });

  it("never returns a negative remaining count", () => {
    expect(remainingForMetric("free", "ai_credits", 100)).toBe(0);
    expect(remainingForMetric("free", "ai_credits", 10)).toBe(20);
  });
});

describe("canConsume", () => {
  it("allows a request that lands exactly on the limit", () => {
    expect(canConsume("free", "scheduled_posts", 9, 1)).toBe(true);
  });

  it("blocks a request that would exceed the limit", () => {
    expect(canConsume("free", "scheduled_posts", 10, 1)).toBe(false);
  });

  it("accounts for multi-unit consumption", () => {
    expect(canConsume("free", "ai_credits", 28, 3)).toBe(false);
    expect(canConsume("free", "ai_credits", 27, 3)).toBe(true);
  });
});

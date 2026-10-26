import { describe, expect, it } from "vitest";
import { parseThreadsInsights } from "@/lib/analytics/threads-insights";
import { buildSearchPattern } from "@/lib/storage/library-server";

describe("parseThreadsInsights", () => {
  it("maps platform metric names to normalized fields", () => {
    const metrics = parseThreadsInsights({
      data: [
        { name: "views", total_value: { value: 1200 } },
        { name: "likes", total_value: { value: 48 } },
        { name: "replies", total_value: { value: 7 } },
        { name: "reposts", total_value: { value: 3 } },
        { name: "quotes", total_value: { value: 1 } },
      ],
    });

    expect(metrics.views).toBe(1200);
    expect(metrics.likes).toBe(48);
    expect(metrics.comments).toBe(7);
    expect(metrics.shares).toBe(3);
    expect(metrics.quotes).toBe(1);
  });

  it("reads values from the values array when total_value is absent", () => {
    const metrics = parseThreadsInsights({
      data: [{ name: "views", values: [{ value: 99 }] }],
    });
    expect(metrics.views).toBe(99);
  });

  it("keeps unknown metrics in raw", () => {
    const metrics = parseThreadsInsights({
      data: [{ name: "followers_gained", total_value: { value: 5 } }],
    });
    expect(metrics.raw).toEqual({ followers_gained: 5 });
    expect(metrics.views).toBeUndefined();
  });

  it("skips entries without a usable value", () => {
    const metrics = parseThreadsInsights({
      data: [{ name: "views" }, { name: "likes", values: [] }],
    });
    expect(metrics.views).toBeUndefined();
    expect(metrics.likes).toBeUndefined();
  });

  it("handles an empty payload", () => {
    expect(parseThreadsInsights({}).raw).toEqual({});
  });
});

describe("buildSearchPattern", () => {
  it("wraps the query in wildcards", () => {
    expect(buildSearchPattern("ship")).toBe("%ship%");
  });

  it("trims surrounding whitespace", () => {
    expect(buildSearchPattern("  ship  ")).toBe("%ship%");
  });

  it("escapes LIKE wildcards so they match literally", () => {
    expect(buildSearchPattern("100%")).toBe("%100\\%%");
    expect(buildSearchPattern("a_b")).toBe("%a\\_b%");
    expect(buildSearchPattern("a\\b")).toBe("%a\\\\b%");
  });
});

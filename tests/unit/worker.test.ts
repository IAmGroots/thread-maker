import { describe, expect, it } from "vitest";
import { backoffMs } from "@/lib/publish/worker";

describe("backoffMs", () => {
  it("starts at 30 seconds", () => {
    expect(backoffMs(1)).toBe(30_000);
  });

  it("doubles per attempt", () => {
    expect(backoffMs(2)).toBe(60_000);
    expect(backoffMs(3)).toBe(120_000);
  });

  it("caps at 15 minutes", () => {
    expect(backoffMs(10)).toBe(15 * 60 * 1000);
    expect(backoffMs(50)).toBe(15 * 60 * 1000);
  });

  it("treats attempt zero like the first attempt", () => {
    expect(backoffMs(0)).toBe(30_000);
  });
});

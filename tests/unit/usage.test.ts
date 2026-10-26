import { describe, expect, it } from "vitest";
import { currentPeriod } from "@/lib/billing/usage";

describe("currentPeriod", () => {
  it("formats the month as YYYY-MM", () => {
    expect(currentPeriod(new Date(Date.UTC(2026, 0, 15)))).toBe("2026-01");
    expect(currentPeriod(new Date(Date.UTC(2026, 11, 31)))).toBe("2026-12");
  });

  it("zero-pads single-digit months", () => {
    expect(currentPeriod(new Date(Date.UTC(2026, 8, 1)))).toBe("2026-09");
  });

  it("uses UTC so the period does not flip at local midnight", () => {
    // 1 Jan 2026 00:30 UTC is still 31 Dec in Jakarta (UTC+7) but the billing
    // period must follow UTC.
    expect(currentPeriod(new Date(Date.UTC(2026, 0, 1, 0, 30)))).toBe("2026-01");
  });
});

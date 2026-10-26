import { describe, expect, it } from "vitest";
import {
  addPeriod,
  daysBetween,
  graceDeadline,
  hasAccessUntil,
  nextPeriodStart,
  trialEnd,
} from "@/lib/billing/periods";

describe("addPeriod", () => {
  it("adds one month for monthly billing", () => {
    expect(addPeriod(new Date(Date.UTC(2026, 0, 15)), "monthly").toISOString()).toBe(
      new Date(Date.UTC(2026, 1, 15)).toISOString(),
    );
  });

  it("adds six months for semiannual billing", () => {
    expect(addPeriod(new Date(Date.UTC(2026, 0, 15)), "semiannual").toISOString()).toBe(
      new Date(Date.UTC(2026, 6, 15)).toISOString(),
    );
  });

  it("rolls over the year", () => {
    expect(addPeriod(new Date(Date.UTC(2026, 11, 10)), "monthly").toISOString()).toBe(
      new Date(Date.UTC(2027, 0, 10)).toISOString(),
    );
  });
});

describe("graceDeadline", () => {
  it("adds three days", () => {
    expect(graceDeadline(new Date(Date.UTC(2026, 0, 10))).toISOString()).toBe(
      new Date(Date.UTC(2026, 0, 13)).toISOString(),
    );
  });
});

describe("trialEnd", () => {
  it("adds seven days", () => {
    expect(trialEnd(new Date(Date.UTC(2026, 0, 10))).toISOString()).toBe(
      new Date(Date.UTC(2026, 0, 17)).toISOString(),
    );
  });
});

describe("hasAccessUntil", () => {
  const end = new Date(Date.UTC(2026, 0, 10));
  const grace = new Date(Date.UTC(2026, 0, 13));

  it("keeps access during the paid period", () => {
    expect(
      hasAccessUntil("active", end, grace, new Date(Date.UTC(2026, 0, 5))),
    ).toBe(true);
  });

  it("keeps access during grace after a cancellation", () => {
    expect(
      hasAccessUntil("canceled", end, grace, new Date(Date.UTC(2026, 0, 12))),
    ).toBe(true);
  });

  it("drops access once grace has passed", () => {
    expect(
      hasAccessUntil("active", end, grace, new Date(Date.UTC(2026, 0, 14))),
    ).toBe(false);
  });

  it("never grants access to an expired subscription", () => {
    expect(
      hasAccessUntil("expired", end, grace, new Date(Date.UTC(2026, 0, 1))),
    ).toBe(false);
  });
});

describe("nextPeriodStart", () => {
  it("starts a renewal where the current period ends", () => {
    const end = new Date(Date.UTC(2026, 0, 20));
    const now = new Date(Date.UTC(2026, 0, 10));
    expect(nextPeriodStart(end, now).toISOString()).toBe(end.toISOString());
  });

  it("starts from now when the previous period already ended", () => {
    const end = new Date(Date.UTC(2026, 0, 1));
    const now = new Date(Date.UTC(2026, 0, 10));
    expect(nextPeriodStart(end, now).toISOString()).toBe(now.toISOString());
  });

  it("starts from now with no previous period", () => {
    const now = new Date(Date.UTC(2026, 0, 10));
    expect(nextPeriodStart(null, now).toISOString()).toBe(now.toISOString());
  });
});

describe("daysBetween", () => {
  it("counts whole days up", () => {
    expect(
      daysBetween(new Date(Date.UTC(2026, 0, 1)), new Date(Date.UTC(2026, 0, 8))),
    ).toBe(7);
  });

  it("never returns a negative value", () => {
    expect(
      daysBetween(new Date(Date.UTC(2026, 0, 8)), new Date(Date.UTC(2026, 0, 1))),
    ).toBe(0);
  });
});

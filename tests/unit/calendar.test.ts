import { describe, expect, it } from "vitest";
import { buildMonthGrid, dayKey, moveToDay } from "@/lib/calendar/grid";

describe("dayKey", () => {
  it("formats a local date as YYYY-MM-DD", () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(dayKey(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

describe("buildMonthGrid", () => {
  it("returns six weeks of cells", () => {
    const grid = buildMonthGrid(2026, 9, new Date(2026, 9, 17));
    expect(grid).toHaveLength(42);
  });

  it("starts on the Monday on or before the first of the month", () => {
    // 1 October 2026 is a Thursday, so the grid starts Monday 28 September.
    const grid = buildMonthGrid(2026, 9, new Date(2026, 9, 17));
    expect(grid[0].key).toBe("2026-09-28");
    expect(grid[0].inMonth).toBe(false);
  });

  it("marks only the current month's days", () => {
    const grid = buildMonthGrid(2026, 9, new Date(2026, 9, 17));
    const inMonth = grid.filter((cell) => cell.inMonth);
    expect(inMonth).toHaveLength(31);
    expect(inMonth[0].key).toBe("2026-10-01");
    expect(inMonth[30].key).toBe("2026-10-31");
  });

  it("marks today exactly once", () => {
    const grid = buildMonthGrid(2026, 9, new Date(2026, 9, 17));
    const today = grid.filter((cell) => cell.isToday);
    expect(today).toHaveLength(1);
    expect(today[0].key).toBe("2026-10-17");
  });

  it("does not mark a date outside the grid as today", () => {
    // The October grid covers 28 Sep to 8 Nov; 1 September is outside it.
    const grid = buildMonthGrid(2026, 9, new Date(2026, 8, 1));
    expect(grid.some((cell) => cell.isToday)).toBe(false);
  });
});

describe("moveToDay", () => {
  it("keeps the original time of day", () => {
    const original = new Date(2026, 9, 17, 14, 30);
    const moved = moveToDay(original, new Date(2026, 9, 20));
    expect(dayKey(moved)).toBe("2026-10-20");
    expect(moved.getHours()).toBe(14);
    expect(moved.getMinutes()).toBe(30);
  });

  it("does not mutate the original date", () => {
    const original = new Date(2026, 9, 17, 9, 0);
    moveToDay(original, new Date(2026, 9, 25));
    expect(dayKey(original)).toBe("2026-10-17");
  });
});

export interface DayCell {
  date: Date;
  key: string;
  inMonth: boolean;
  isToday: boolean;
}

/** Local-date key in YYYY-MM-DD, independent of timezone offsets. */
export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Six weeks of cells starting on the Monday on or before the first of the
 * month. Six rows keeps the grid height stable while paging months.
 */
export function buildMonthGrid(
  year: number,
  month: number,
  today: Date = new Date(),
): DayCell[] {
  const first = new Date(year, month, 1);
  const firstWeekday = (first.getDay() + 6) % 7; // Monday = 0
  const gridStart = new Date(year, month, 1 - firstWeekday);
  const todayKey = dayKey(today);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + index,
    );

    return {
      date,
      key: dayKey(date),
      inMonth: date.getMonth() === month,
      isToday: dayKey(date) === todayKey,
    };
  });
}

/** Move an item to another day while keeping its original time of day. */
export function moveToDay(original: Date, targetDay: Date): Date {
  const next = new Date(targetDay);
  next.setHours(original.getHours(), original.getMinutes(), 0, 0);
  return next;
}

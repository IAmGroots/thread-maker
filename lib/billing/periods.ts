export type BillingPeriod = "monthly" | "semiannual";

export const GRACE_DAYS = 3;
export const TRIAL_DAYS = 7;

/** End of a paid period, measured from the start. */
export function addPeriod(start: Date, period: BillingPeriod): Date {
  const end = new Date(start);
  if (period === "semiannual") {
    end.setMonth(end.getMonth() + 6);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}

/** Access continues this long after the paid period ends. */
export function graceDeadline(periodEnd: Date): Date {
  const deadline = new Date(periodEnd);
  deadline.setDate(deadline.getDate() + GRACE_DAYS);
  return deadline;
}

export function trialEnd(start: Date = new Date()): Date {
  const end = new Date(start);
  end.setDate(end.getDate() + TRIAL_DAYS);
  return end;
}

/**
 * Whether the workspace should still have paid access. `canceled` keeps access
 * until the period (plus grace) runs out.
 */
export function hasAccessUntil(
  status: string,
  periodEnd: Date,
  graceUntil: Date | null,
  now: Date = new Date(),
): boolean {
  if (status === "expired") return false;
  const deadline = graceUntil ?? graceDeadline(periodEnd);
  return deadline.getTime() > now.getTime();
}

/**
 * Renewal starts when the current paid period ends, never earlier, so paying
 * a few days in advance does not shorten the new period.
 */
export function nextPeriodStart(
  currentPeriodEnd: Date | null,
  now: Date = new Date(),
): Date {
  if (currentPeriodEnd && currentPeriodEnd.getTime() > now.getTime()) {
    return currentPeriodEnd;
  }
  return now;
}

export function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

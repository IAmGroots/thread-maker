export type PlanId = "free" | "starter" | "creator" | "pro";

export interface PlanLimits {
  channels: number;
  scheduledPostsPerMonth: number;
  aiCreditsPerMonth: number;
  mediaBytes: number;
  analyticsRetentionDays: number;
  members: number;
}

const MB = 1024 * 1024;
const GB = 1024 * MB;

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    channels: 1,
    scheduledPostsPerMonth: 10,
    aiCreditsPerMonth: 30,
    mediaBytes: 100 * MB,
    analyticsRetentionDays: 7,
    members: 1,
  },
  starter: {
    channels: 2,
    scheduledPostsPerMonth: 60,
    aiCreditsPerMonth: 150,
    mediaBytes: 1 * GB,
    analyticsRetentionDays: 30,
    members: 1,
  },
  creator: {
    channels: 4,
    scheduledPostsPerMonth: 200,
    aiCreditsPerMonth: 400,
    mediaBytes: 3 * GB,
    analyticsRetentionDays: 90,
    members: 1,
  },
  pro: {
    channels: 8,
    scheduledPostsPerMonth: 600,
    aiCreditsPerMonth: 900,
    mediaBytes: 8 * GB,
    analyticsRetentionDays: 180,
    members: 1,
  },
};

export const PLAN_PRICES_IDR: Record<PlanId, number> = {
  free: 0,
  starter: 49_000,
  creator: 89_000,
  pro: 149_000,
};

/**
 * Six-month price: two months free. The UI does not offer it in the MVP, but
 * the database and the API already accept `semiannual`.
 * Keep in sync with public.plan_price().
 */
export const PLAN_PRICES_SEMIANNUAL_IDR: Record<PlanId, number> = {
  free: 0,
  starter: 245_000,
  creator: 445_000,
  pro: 745_000,
};

export type PaidPlanId = "starter" | "creator" | "pro";

export const PAID_PLAN_IDS: PaidPlanId[] = ["starter", "creator", "pro"];

export function isPaidPlan(value: string): value is PaidPlanId {
  return (PAID_PLAN_IDS as string[]).includes(value);
}

export function getPlanPrice(
  plan: PlanId,
  period: "monthly" | "semiannual" = "monthly",
): number {
  return period === "semiannual"
    ? PLAN_PRICES_SEMIANNUAL_IDR[plan]
    : PLAN_PRICES_IDR[plan];
}

export type UsageMetric =
  | "scheduled_posts"
  | "ai_credits"
  | "storage_bytes";

export function getPlanLimits(plan: PlanId): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function limitForMetric(plan: PlanId, metric: UsageMetric): number {
  const limits = PLAN_LIMITS[plan];
  switch (metric) {
    case "scheduled_posts":
      return limits.scheduledPostsPerMonth;
    case "ai_credits":
      return limits.aiCreditsPerMonth;
    case "storage_bytes":
      return limits.mediaBytes;
  }
}

export function remainingForMetric(
  plan: PlanId,
  metric: UsageMetric,
  used: number,
): number {
  return Math.max(0, limitForMetric(plan, metric) - used);
}

export function canConsume(
  plan: PlanId,
  metric: UsageMetric,
  used: number,
  amount = 1,
): boolean {
  return used + amount <= limitForMetric(plan, metric);
}

/** AI credits are charged per successful generation request. */
export const CREDITS_PER_AI_REQUEST = 1;

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CREDITS_PER_AI_REQUEST,
  getPlanLimits,
  type PlanId,
} from "@/lib/billing/credits";

type Client = SupabaseClient<Database>;

export type UsageMetric = "scheduled_posts" | "ai_credits" | "storage_bytes";

export interface UsageSnapshot {
  period: string;
  aiCredits: { used: number; limit: number };
  scheduledPosts: { used: number; limit: number };
}

/** Billing periods are calendar months in UTC, e.g. "2026-10". */
export function currentPeriod(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function limitFor(plan: PlanId, metric: UsageMetric): number {
  const limits = getPlanLimits(plan);
  switch (metric) {
    case "ai_credits":
      return limits.aiCreditsPerMonth;
    case "scheduled_posts":
      return limits.scheduledPostsPerMonth;
    case "storage_bytes":
      return limits.mediaBytes;
  }
}

/**
 * Consume units from a plan counter atomically. The database derives the limit
 * from the workspace plan, so a caller can never raise its own ceiling.
 * Returns false when the request would exceed the plan.
 *
 * Usage RPCs are service-role only: the browser can never refund its own
 * credits or spend another workspace's.
 */
export async function consumeUsage(
  workspaceId: string,
  metric: UsageMetric,
  amount = 1,
): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_usage", {
    p_workspace: workspaceId,
    p_period: currentPeriod(),
    p_metric: metric,
    p_amount: amount,
  });

  if (error) throw new Error(error.message);
  return data != null;
}

export async function refundUsage(
  workspaceId: string,
  metric: UsageMetric,
  amount = 1,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("refund_usage", {
    p_workspace: workspaceId,
    p_period: currentPeriod(),
    p_metric: metric,
    p_amount: amount,
  });

  if (error) throw new Error(error.message);
}

export async function getUsageSnapshot(
  client: Client,
  workspaceId: string,
  plan: PlanId,
): Promise<UsageSnapshot> {
  const period = currentPeriod();

  const { data, error } = await client
    .from("usage_counters")
    .select("metric, value")
    .eq("workspace_id", workspaceId)
    .eq("period", period);

  if (error) throw new Error(error.message);

  const used = new Map((data ?? []).map((row) => [row.metric, Number(row.value)]));

  return {
    period,
    aiCredits: {
      used: used.get("ai_credits") ?? 0,
      limit: limitFor(plan, "ai_credits"),
    },
    scheduledPosts: {
      used: used.get("scheduled_posts") ?? 0,
      limit: limitFor(plan, "scheduled_posts"),
    },
  };
}

export { CREDITS_PER_AI_REQUEST };

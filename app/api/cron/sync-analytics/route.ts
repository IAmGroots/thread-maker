import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncAnalytics } from "@/lib/analytics/sync";
import { apiErrorResponse } from "@/lib/security/apiError";

// Insights are rate limited by the platforms and change slowly, so this runs
// on its own schedule instead of sharing the publish cron's budget.
const WORKSPACES_PER_RUN = 5;
const TARGETS_PER_WORKSPACE = 10;
// Only refresh posts that were published in the last week.
const LOOKBACK_HOURS = 24 * 7;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const supabase = createAdminClient();
    const since = new Date(
      Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000,
    ).toISOString();

    const { data: recent, error } = await supabase
      .from("post_targets")
      .select("workspace_id, published_at")
      .eq("status", "published")
      .gte("published_at", since)
      .order("published_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    const workspaceIds = Array.from(
      new Set((recent ?? []).map((row) => row.workspace_id)),
    ).slice(0, WORKSPACES_PER_RUN);

    const summaries: Array<{ workspaceId: string; synced: number; skipped: number }> = [];

    for (const workspaceId of workspaceIds) {
      try {
        const summary = await syncAnalytics(workspaceId, TARGETS_PER_WORKSPACE);
        summaries.push({
          workspaceId,
          synced: summary.synced,
          skipped: summary.skipped,
        });
      } catch (error) {
        console.warn(`[cron] analytics sync failed for ${workspaceId}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      workspaces: workspaceIds.length,
      summaries,
    });
  } catch (error) {
    return apiErrorResponse(error, "cron-sync-analytics", 500);
  }
}

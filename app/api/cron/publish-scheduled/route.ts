import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processDueTargets } from "@/lib/publish/worker";
import { refreshExpiringAccounts } from "@/lib/social/refresh";
import { apiErrorResponse } from "@/lib/security/apiError";

// One target is a full reply chain and can take minutes. Claiming is atomic,
// so overlapping runs never publish the same target twice.
const BATCH_SIZE = 2;
// Stop starting new chains once the run has been alive this long, so a long
// chain cannot pile up a second one in the same invocation.
const MAX_WALL_MS = 20_000;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

/**
 * Publishes due targets from the Postgres queue.
 *
 * Protected by CRON_SECRET. Vendor-agnostic: call it from a Cloudflare Cron
 * Trigger, cron-job.org, Upstash, or any scheduler with:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/publish-scheduled
 */
export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Downgrade subscriptions whose paid period and grace have run out.
    let expired = 0;
    const { data: expiredCount, error: expireError } = await supabase.rpc(
      "expire_due_subscriptions",
    );
    if (expireError) {
      console.warn(`[cron] subscription expiry failed: ${expireError.message}`);
    } else {
      expired = Number(expiredCount ?? 0);
    }

    // In-app reminders at 7 days and 1 day before a paid period ends.
    const { error: reminderError } = await supabase.rpc("create_expiry_reminders");
    if (reminderError) {
      console.warn(`[cron] expiry reminders failed: ${reminderError.message}`);
    }

    // Analytics and notifications older than the plan's retention window.
    let pruned = 0;
    const { data: prunedCount, error: pruneError } = await supabase.rpc(
      "prune_expired_data",
    );
    if (pruneError) {
      console.warn(`[cron] retention failed: ${pruneError.message}`);
    } else {
      pruned = Number(prunedCount ?? 0);
    }

    const summary = await processDueTargets(supabase, BATCH_SIZE, {
      maxWallMs: MAX_WALL_MS,
    });

    // Keep tokens alive before they lapse, and flag the ones the platform
    // rejected so Settings can ask for a reconnect.
    let tokenRefresh = { checked: 0, refreshed: 0, expired: 0 };
    try {
      tokenRefresh = await refreshExpiringAccounts(supabase, 3, 3);
    } catch (error) {
      console.warn(`[cron] token refresh failed:`, error);
    }

    return NextResponse.json({
      success: true,
      processed: summary.processed,
      results: summary.results,
      expiredSubscriptions: expired,
      prunedRecords: pruned,
      tokenRefresh,
    });
  } catch (error) {
    return apiErrorResponse(error, "cron-publish-scheduled", 500);
  }
}

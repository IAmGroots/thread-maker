import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";
import { getProvider } from "@/lib/providers/registry";
import type { ProviderId } from "@/lib/providers/types";
import { getPublishAccount } from "@/lib/social/accounts";

export interface SyncSummary {
  synced: number;
  skipped: number;
  accountsMissingScope: number;
}

/**
 * Pull insights for the most recent published targets. Platforms rate limit
 * insights calls, so the batch is small and the cron runs it periodically
 * rather than on every page view.
 */
export async function syncAnalytics(
  workspaceId: string,
  limit = 25,
): Promise<SyncSummary> {
  // Tokens are service-role only, so analytics reads and writes run as admin.
  // The caller has already checked that the user belongs to this workspace.
  const client = createAdminClient();
  const { data: targets, error } = await client
    .from("post_targets")
    .select("id, social_account_id, provider_post_id, published_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "published")
    .not("provider_post_id", "is", null)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const summary: SyncSummary = { synced: 0, skipped: 0, accountsMissingScope: 0 };
  const tokenCache = new Map<string, { provider: ProviderId; accessToken: string } | null>();

  for (const target of targets ?? []) {
    if (!target.provider_post_id) {
      summary.skipped += 1;
      continue;
    }

    let account = tokenCache.get(target.social_account_id);
    if (account === undefined) {
      const loaded = await getPublishAccount(
        client,
        workspaceId,
        target.social_account_id,
      );
      account = loaded
        ? { provider: loaded.provider, accessToken: loaded.accessToken }
        : null;
      tokenCache.set(target.social_account_id, account);
    }

    if (!account) {
      summary.skipped += 1;
      continue;
    }

    const provider = getProvider(account.provider);
    if (!provider.getAnalytics) {
      summary.skipped += 1;
      continue;
    }

    const metrics = await provider.getAnalytics({
      accessToken: account.accessToken,
      providerPostId: target.provider_post_id,
    });

    if (metrics.length === 0) {
      // Usually a missing insights scope or a post that is too new.
      summary.accountsMissingScope += 1;
      summary.skipped += 1;
      continue;
    }

    const rows = metrics.map((metric) => {
      // Keep this in step with the dashboard: every interaction counts, quotes
      // included, or the two screens disagree.
      const interactions =
        (metric.likes ?? 0) +
        (metric.comments ?? 0) +
        (metric.shares ?? 0) +
        (metric.quotes ?? 0);
      const engagementRate =
        metric.views && metric.views > 0
          ? Number((interactions / metric.views).toFixed(4))
          : null;

      return {
        workspace_id: workspaceId,
        social_account_id: target.social_account_id,
        provider_post_id: target.provider_post_id as string,
        post_target_id: target.id,
        captured_at: metric.capturedAt.toISOString(),
        views: metric.views ?? null,
        likes: metric.likes ?? null,
        comments: metric.comments ?? null,
        shares: metric.shares ?? null,
        quotes: metric.quotes ?? null,
        engagement_rate: engagementRate,
        raw: metric.raw as unknown as Json,
      };
    });

    const { error: insertError } = await client
      .from("analytics_snapshots")
      .insert(rows);

    if (insertError) {
      summary.skipped += 1;
      continue;
    }

    summary.synced += rows.length;
  }

  return summary;
}

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import type {
  ClaimedTarget,
  FailOptions,
  QueueAdapter,
} from "@/lib/queue/types";
import type { PublishResult } from "@/lib/providers/types";

type ClaimRow = {
  id: string;
  workspace_id: string;
  content_item_id: string;
  social_account_id: string;
  provider: string;
  scheduled_for: string;
  attempts: number;
  checkpoint: number;
  provider_state: Json;
  content_override: Json;
};

function toTarget(row: ClaimRow): ClaimedTarget {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    contentItemId: row.content_item_id,
    socialAccountId: row.social_account_id,
    provider: row.provider as ClaimedTarget["provider"],
    scheduledFor: new Date(row.scheduled_for),
    attempts: row.attempts,
    checkpoint: row.checkpoint,
    providerState: (row.provider_state ?? {}) as Record<string, unknown>,
    contentOverride: (row.content_override ?? {}) as ClaimedTarget["contentOverride"],
  };
}

/**
 * Postgres-backed queue. Claiming is a single atomic UPDATE ... FOR UPDATE SKIP
 * LOCKED inside a security-definer function, so two workers never take the same
 * target and a crashed worker's lease expires back into the queue.
 */
export function createPostgresQueue(
  client: SupabaseClient<Database>,
): QueueAdapter {
  return {
    async claimDue(limit: number): Promise<ClaimedTarget[]> {
      const { data, error } = await client.rpc("claim_post_targets", {
        p_limit: limit,
      });
      if (error) throw new Error(`Failed to claim targets: ${error.message}`);
      return ((data ?? []) as ClaimRow[]).map(toTarget);
    },

    async claimOne(id: string): Promise<ClaimedTarget | null> {
      const { data, error } = await client.rpc("claim_post_target", {
        p_id: id,
      });
      if (error) throw new Error(`Failed to claim target: ${error.message}`);
      const rows = (data ?? []) as ClaimRow[];
      return rows.length > 0 ? toTarget(rows[0]) : null;
    },

    async saveCheckpoint(
      id: string,
      checkpoint: number,
      providerState: Record<string, unknown>,
    ): Promise<void> {
      const { error } = await client
        .from("post_targets")
        .update({
          checkpoint,
          provider_state: providerState as unknown as Json,
          // Heartbeat: a long chain keeps renewing its lease so a second worker
          // does not reclaim a target that is still publishing.
          locked_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("status", "publishing");

      if (error) throw new Error(`Failed to save checkpoint: ${error.message}`);
    },

    async markPublished(id: string, result: PublishResult): Promise<void> {
      const { error } = await client.rpc("complete_post_target", {
        p_id: id,
        p_result: result as unknown as Json,
      });
      if (error) throw new Error(`Failed to mark target published: ${error.message}`);
    },

    async markPartial(id: string, result: PublishResult): Promise<void> {
      const { error } = await client.rpc("fail_post_target", {
        p_id: id,
        p_code: "partial_publish",
        p_message: result.errorMessage ?? "Thread stopped partway.",
        p_retry_at: null,
        p_checkpoint: result.publishedCount,
      });
      if (error) throw new Error(`Failed to mark target partial: ${error.message}`);
    },

    async markFailed(id: string, options: FailOptions): Promise<void> {
      if (options.providerState) {
        const { error: stateError } = await client
          .from("post_targets")
          .update({
            provider_state: options.providerState as unknown as Json,
          })
          .eq("id", id)
          .eq("status", "publishing");
        if (stateError) {
          throw new Error(`Failed to save provider state: ${stateError.message}`);
        }
      }

      const { error } = await client.rpc("fail_post_target", {
        p_id: id,
        p_code: options.code,
        p_message: options.message,
        p_retry_at: options.retryAt?.toISOString() ?? null,
        p_checkpoint: options.checkpoint ?? null,
      });
      if (error) throw new Error(`Failed to mark target failed: ${error.message}`);
    },

    async releaseExpiredLeases(leaseMs: number): Promise<number> {
      const cutoff = new Date(Date.now() - leaseMs).toISOString();
      const { data, error } = await client
        .from("post_targets")
        .update({ status: "scheduled", locked_at: null })
        .eq("status", "publishing")
        .lt("locked_at", cutoff)
        .select("id");

      if (error) throw new Error(`Failed to release leases: ${error.message}`);
      return data?.length ?? 0;
    },
  };
}

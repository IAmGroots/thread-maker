import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import { createPostgresQueue } from "@/lib/queue/postgres";
import type { ClaimedTarget, QueueAdapter } from "@/lib/queue/types";
import { getProvider } from "@/lib/providers/registry";
import type { PostMedia, PublishResult } from "@/lib/providers/types";
import { getPublishAccount } from "@/lib/social/accounts";
import { signMediaUrl } from "@/lib/media/storage";
import { createNotification } from "@/lib/notifications/service";

const MAX_ATTEMPTS = 5;
// A worker that dies mid-chain leaves a lease; after this it can be reclaimed.
// The worker renews `locked_at` on every checkpoint, so this only needs to be
// longer than the slowest single post (poll + retries), not the whole chain.
const LEASE_MS = 20 * 60 * 1000;
const RETRY_BASE_MS = 30 * 1000;
const RETRY_MAX_MS = 15 * 60 * 1000;

export interface TargetResult {
  id: string;
  status: "published" | "partial" | "failed" | "retry_scheduled";
  publishedCount: number;
  error?: string;
}

export interface WorkerSummary {
  processed: number;
  results: TargetResult[];
}

type AdminClient = SupabaseClient<Database>;

export function backoffMs(attempt: number): number {
  return Math.min(RETRY_BASE_MS * 2 ** Math.max(attempt - 1, 0), RETRY_MAX_MS);
}

async function resolveSegments(
  supabase: AdminClient,
  target: ClaimedTarget,
): Promise<string[]> {
  const override = target.contentOverride?.segments;
  if (Array.isArray(override) && override.length > 0) {
    return override;
  }

  const { data, error } = await supabase
    .from("content_segments")
    .select("position, text")
    .eq("content_item_id", target.contentItemId)
    .order("position", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.text);
}

async function resolveMedia(
  supabase: AdminClient,
  target: ClaimedTarget,
): Promise<PostMedia[]> {
  const { data: links, error: linkError } = await supabase
    .from("post_target_media")
    .select("media_asset_id, position")
    .eq("post_target_id", target.id)
    .order("position", { ascending: true });

  if (linkError) throw new Error(linkError.message);
  if (!links || links.length === 0) return [];

  const { data: assets, error: assetError } = await supabase
    .from("media_assets")
    .select("id, storage_path, mime_type, alt_text")
    .in("id", links.map((link) => link.media_asset_id));

  if (assetError) throw new Error(assetError.message);

  const byId = new Map((assets ?? []).map((asset) => [asset.id, asset]));
  const media: PostMedia[] = [];

  for (const link of links) {
    const asset = byId.get(link.media_asset_id);
    if (!asset) continue;

    const url = await signMediaUrl(supabase, asset.storage_path, 3600);
    if (!url) continue;

    media.push({
      url,
      mimeType: asset.mime_type,
      altText: asset.alt_text ?? undefined,
    });
  }

  return media;
}

async function scheduleRetryOrFail(
  queue: QueueAdapter,
  target: ClaimedTarget,
  code: string,
  message: string,
  checkpoint: number,
  providerState?: Record<string, unknown>,
): Promise<TargetResult["status"]> {
  const canRetry = target.attempts < MAX_ATTEMPTS;
  const retryAt = canRetry
    ? new Date(Date.now() + backoffMs(target.attempts))
    : undefined;

  await queue.markFailed(target.id, {
    code,
    message,
    retryAt,
    checkpoint,
    providerState,
  });

  return canRetry ? "retry_scheduled" : "failed";
}

/**
 * A dead token will not fix itself, so this stops immediately instead of
 * burning the remaining retry budget.
 */
async function markExpired(
  queue: QueueAdapter,
  target: ClaimedTarget,
  message: string,
): Promise<TargetResult["status"]> {
  await queue.markFailed(target.id, {
    code: "account_expired",
    message,
    checkpoint: target.checkpoint,
  });
  return "failed";
}

async function notifyOutcome(
  supabase: AdminClient,
  target: ClaimedTarget,
  result: TargetResult,
): Promise<void> {
  if (result.status === "retry_scheduled") return;

  const { data: content } = await supabase
    .from("content_items")
    .select("created_by, title")
    .eq("id", target.contentItemId)
    .maybeSingle();

  const userId = content?.created_by;
  if (!userId) return;

  const { data: account } = await supabase
    .from("social_accounts")
    .select("username")
    .eq("id", target.socialAccountId)
    .maybeSingle();

  const handle = account?.username ? `@${account.username}` : "your account";
  const title = content?.title?.trim() || "Your post";

  if (result.status === "published") {
    await createNotification(supabase, {
      workspaceId: target.workspaceId,
      userId,
      type: "publish_succeeded",
      title: `Published to ${handle}`,
      body: title,
      entityType: "post_target",
      entityId: target.id,
      params: { handle, title },
    });
    return;
  }

  if (result.status === "partial") {
    await createNotification(supabase, {
      workspaceId: target.workspaceId,
      userId,
      type: "publish_partial",
      title: `Part of the thread reached ${handle}`,
      body: `${result.publishedCount} posts went out before it stopped. ${result.error ?? ""}`.trim(),
      entityType: "post_target",
      entityId: target.id,
      params: {
        handle,
        count: result.publishedCount,
        error: result.error ?? null,
      },
    });
    return;
  }

  await createNotification(supabase, {
    workspaceId: target.workspaceId,
    userId,
    type: "publish_failed",
    title: `Publishing to ${handle} failed`,
    body: result.error ?? title,
    entityType: "post_target",
    entityId: target.id,
    params: { handle, error: result.error ?? null, title },
  });
}

async function publishTarget(
  supabase: AdminClient,
  queue: QueueAdapter,
  target: ClaimedTarget,
): Promise<TargetResult> {
  let result: TargetResult;

  try {
    result = await runPublish(supabase, queue, target);
  } catch (error) {
    // A decrypt failure, a missing row, or a schema surprise must not leave the
    // target stuck in "publishing" until the lease expires.
    const message = error instanceof Error ? error.message : String(error);

    try {
      await queue.markFailed(target.id, {
        code: "worker_error",
        message,
        checkpoint: target.checkpoint,
      });
    } catch {
      // The lease will reclaim it.
    }

    result = {
      id: target.id,
      status: "failed",
      publishedCount: target.checkpoint,
      error: message,
    };
  }

  await notifyOutcome(supabase, target, result).catch(() => {});
  return result;
}

async function runPublish(
  supabase: AdminClient,
  queue: QueueAdapter,
  target: ClaimedTarget,
): Promise<TargetResult> {
  const account = await getPublishAccount(
    supabase,
    target.workspaceId,
    target.socialAccountId,
  );

  if (!account) {
    // Distinguish a revoked or expired token from a missing row so the user
    // knows whether to reconnect instead of just retrying.
    const { data: row } = await supabase
      .from("social_accounts")
      .select("status")
      .eq("id", target.socialAccountId)
      .maybeSingle();

    const expired = row?.status === "expired" || row?.status === "revoked";
    const code = expired ? "account_expired" : "account_unavailable";
    const message = expired
      ? "This account needs to be reconnected before it can publish."
      : "The connected account is missing or belongs to another workspace.";

    const status = expired
      ? await markExpired(queue, target, message)
      : await scheduleRetryOrFail(queue, target, code, message, target.checkpoint);

    return {
      id: target.id,
      status,
      publishedCount: target.checkpoint,
      error: message,
    };
  }

  const provider = getProvider(target.provider);
  const segments = await resolveSegments(supabase, target);
  const media = await resolveMedia(supabase, target);

  const validation = provider.validatePost({ segments, media });
  if (!validation.valid) {
    const message = validation.issues.map((issue) => issue.message).join(" ");
    await queue.markFailed(target.id, {
      code: "invalid_post",
      message,
      checkpoint: target.checkpoint,
    });
    return {
      id: target.id,
      status: "failed",
      publishedCount: target.checkpoint,
      error: message,
    };
  }

  const { data: attemptRow } = await supabase
    .from("publish_attempts")
    .insert({
      post_target_id: target.id,
      attempt: target.attempts,
      status: "started",
    })
    .select("id")
    .single();

  let result: PublishResult;

  try {
    result = await provider.publish({
      accessToken: account.accessToken,
      post: { segments, media },
      idempotencyKey: target.id,
      providerState: target.providerState,
      checkpoint: target.checkpoint,
      onCheckpoint: async (checkpoint, providerState) => {
        await queue.saveCheckpoint(target.id, checkpoint, providerState);
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (attemptRow) {
      await supabase
        .from("publish_attempts")
        .update({
          status: "failed",
          error_message: message,
          finished_at: new Date().toISOString(),
        })
        .eq("id", attemptRow.id);
    }

    const status = await scheduleRetryOrFail(
      queue,
      target,
      "publish_error",
      message,
      target.checkpoint,
    );

    return {
      id: target.id,
      status,
      publishedCount: target.checkpoint,
      error: message,
    };
  }

  if (attemptRow) {
    await supabase
      .from("publish_attempts")
      .update({
        status: result.status === "failed" ? "failed" : "succeeded",
        response: result as unknown as Json,
        error_code: result.errorCode ?? null,
        error_message: result.errorMessage ?? null,
        finished_at: new Date().toISOString(),
      })
      .eq("id", attemptRow.id);
  }

  if (result.status === "published") {
    await queue.markPublished(target.id, result);
    return {
      id: target.id,
      status: "published",
      publishedCount: result.publishedCount,
    };
  }

  const status = await scheduleRetryOrFail(
    queue,
    target,
    result.status === "partial" ? "partial_publish" : "publish_error",
    result.errorMessage ?? "Publishing stopped before the thread finished.",
    result.publishedCount,
    result.providerState,
  );

  return {
    id: target.id,
    status,
    publishedCount: result.publishedCount,
    error: result.errorMessage,
  };
}

export interface ProcessOptions {
  /** Stop starting new targets after this many milliseconds. */
  maxWallMs?: number;
}

/**
 * Process due targets. Claiming is atomic, so concurrent runs are safe; the
 * wall-clock guard only stops one invocation from starting a new chain while
 * the previous one is still finishing.
 */
export async function processDueTargets(
  supabase: AdminClient,
  limit = 5,
  options: ProcessOptions = {},
): Promise<WorkerSummary> {
  const queue = createPostgresQueue(supabase);
  await queue.releaseExpiredLeases(LEASE_MS);

  const deadline = options.maxWallMs
    ? Date.now() + options.maxWallMs
    : Number.POSITIVE_INFINITY;

  const results: TargetResult[] = [];

  for (let index = 0; index < limit; index += 1) {
    if (Date.now() > deadline) break;

    const claimed = await queue.claimDue(1);
    if (claimed.length === 0) break;

    results.push(await publishTarget(supabase, queue, claimed[0]));
  }

  return { processed: results.length, results };
}

/** Process one target inline, used by "publish now". */
export async function processTargetById(
  supabase: AdminClient,
  id: string,
): Promise<WorkerSummary> {
  const queue = createPostgresQueue(supabase);
  const target = await queue.claimOne(id);

  if (!target) {
    return { processed: 0, results: [] };
  }

  const result = await publishTarget(supabase, queue, target);
  return { processed: 1, results: [result] };
}

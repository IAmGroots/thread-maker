import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken, encryptToken } from "@/lib/threads/crypto";
import { ensureFreshToken } from "@/lib/threads/client";
import { publishThreadChain } from "@/lib/threads/publish";
import { apiErrorResponse } from "@/lib/security/apiError";

// How many due posts to process per run. Keeps a single invocation well inside
// the Cloudflare Workers time budget even when several chains are due at once.
const BATCH_SIZE = 5;
// Auto-retry a failed chain once before giving up.
const MAX_ATTEMPTS = 2;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

/**
 * Publishes scheduled posts whose time has come.
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
    const nowIso = new Date().toISOString();

    // Claim a batch of due posts atomically: flip status scheduled -> publishing
    // only for rows still in 'scheduled', so two concurrent runs never publish
    // the same post twice.
    const { data: duePosts, error: dueError } = await supabase
      .from("scheduled_posts")
      .select("id, user_id, threads_account_id, saved_thread_id, reply_chain, attempts")
      .eq("status", "scheduled")
      .lte("scheduled_for", nowIso)
      .order("scheduled_for", { ascending: true })
      .limit(BATCH_SIZE);

    if (dueError) throw new Error(dueError.message);
    if (!duePosts || duePosts.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    const results: Array<{ id: string; status: string; publishedCount?: number }> = [];

    for (const post of duePosts) {
      // Atomic claim.
      const { data: claimed } = await supabase
        .from("scheduled_posts")
        .update({ status: "publishing" })
        .eq("id", post.id)
        .eq("status", "scheduled")
        .select("id");

      if (!claimed || claimed.length === 0) {
        // Another run grabbed it.
        continue;
      }

      try {
        if (!post.threads_account_id) {
          throw new Error("Scheduled post has no Threads account");
        }

        const { data: account, error: accountError } = await supabase
          .from("threads_accounts")
          .select("id, username, access_token, token_expires_at, is_active")
          .eq("id", post.threads_account_id)
          .maybeSingle();

        if (accountError) throw new Error(accountError.message);
        if (!account || !account.is_active) {
          throw new Error("Threads account not found or inactive");
        }

        let accessToken = await decryptToken(account.access_token);
        const fresh = await ensureFreshToken(accessToken, account.token_expires_at);
        if (fresh.accessToken !== accessToken) {
          accessToken = fresh.accessToken;
          const encrypted = await encryptToken(accessToken);
          await supabase
            .from("threads_accounts")
            .update({
              access_token: encrypted,
              token_expires_at: fresh.expiresAt || account.token_expires_at,
            })
            .eq("id", account.id);
        }

        const tweets = Array.isArray(post.reply_chain)
          ? (post.reply_chain as string[])
          : [];
        const result = await publishThreadChain(accessToken, tweets);
        const primaryPostId = result.postIds[0] ?? null;

        // Log the publish for the per-account badge.
        await supabase.from("thread_publishes").insert({
          user_id: post.user_id,
          saved_thread_id: post.saved_thread_id,
          threads_account_id: account.id,
          status: result.status,
          threads_post_id: primaryPostId,
          reply_chain: result.postIds,
          error_message: result.error ?? null,
        });

        const attempts = (post.attempts ?? 0) + 1;
        const canRetry = result.status !== "published" && attempts < MAX_ATTEMPTS;

        await supabase
          .from("scheduled_posts")
          .update({
            status: canRetry ? "scheduled" : result.status,
            threads_post_id: primaryPostId,
            error_message: result.error ?? null,
            published_at: result.status === "published" ? new Date().toISOString() : null,
            attempts,
          })
          .eq("id", post.id);

        results.push({ id: post.id, status: result.status, publishedCount: result.publishedCount });
      } catch (error) {
        const attempts = (post.attempts ?? 0) + 1;
        const message = error instanceof Error ? error.message : String(error);
        const canRetry = attempts < MAX_ATTEMPTS;

        await supabase
          .from("scheduled_posts")
          .update({
            status: canRetry ? "scheduled" : "failed",
            error_message: message,
            attempts,
          })
          .eq("id", post.id);

        results.push({ id: post.id, status: canRetry ? "retry_scheduled" : "failed" });
      }
    }

    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (error) {
    return apiErrorResponse(error, "cron-publish-scheduled", 500);
  }
}

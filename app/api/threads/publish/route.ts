import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentWorkspace } from "@/lib/workspace/current";
import { resolveContentItem } from "@/lib/content/items";
import { kickTarget } from "@/lib/publish/kick";
import { publishRequestSchema } from "@/lib/validations/threads";
import { apiErrorResponse } from "@/lib/security/apiError";
import { mediaBelongsToWorkspace } from "@/lib/media/access";
import {
  contentFingerprint,
  publishNowIdempotencyKey,
} from "@/lib/threads/idempotency";

/**
 * Queue a thread for immediate publishing.
 *
 * The chain can take minutes, so this returns 202 with a target id and the
 * client polls `GET /api/targets/[id]`. A retried request with the same
 * `requestId` resolves to the same target instead of publishing twice.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const workspace = await getCurrentWorkspace();

    if (!user || !workspace) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const raw = await request.json().catch(() => null);
    const parsed = publishRequestSchema.safeParse(raw);
    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    const { accountId, savedThreadId, tweets, mediaId, requestId } = parsed.data;
    const admin = createAdminClient();

    const { data: account, error: accountError } = await admin
      .from("social_accounts")
      .select("id, username, status")
      .eq("id", accountId)
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    if (accountError) throw new Error(accountError.message);
    if (!account || account.status !== "active") {
      return NextResponse.json(
        { success: false, error: "Account not found or inactive" },
        { status: 404 },
      );
    }

    if (mediaId && !(await mediaBelongsToWorkspace(admin, workspace.id, mediaId))) {
      return NextResponse.json(
        { success: false, error: "Media not found" },
        { status: 404 },
      );
    }

    const contentItemId = await resolveContentItem({
      workspaceId: workspace.id,
      userId: user.id,
      savedThreadId,
      segments: tweets,
    });

    const fingerprint = await contentFingerprint(tweets);
    const idempotencyKey = publishNowIdempotencyKey(
      fingerprint,
      accountId,
      requestId,
      mediaId,
    );

    const { data: targetId, error: createError } = await admin.rpc(
      "create_post_target",
      {
        p_workspace: workspace.id,
        p_content_item: contentItemId,
        p_social_account: accountId,
        p_scheduled_for: new Date().toISOString(),
        p_timezone: workspace.timezone,
        p_idempotency_key: idempotencyKey,
        p_segments: tweets,
        p_media: mediaId ?? null,
        p_consume: true,
      },
    );

    if (createError) {
      if (createError.message.includes("scheduled_posts_exhausted")) {
        return NextResponse.json(
          {
            success: false,
            error: "You have used all scheduled posts for this month on your plan.",
            code: "scheduled_posts_exhausted",
          },
          { status: 402 },
        );
      }
      throw new Error(createError.message);
    }

    if (!targetId) throw new Error("Target creation returned no id");

    const { data: target, error: readError } = await admin
      .from("post_targets")
      .select("status, checkpoint, provider_post_id, provider_url, error_message")
      .eq("id", targetId)
      .single();

    if (readError) throw new Error(readError.message);

    // A retried request resolves to the same target. Report what happened
    // instead of publishing again.
    if (target.status !== "scheduled" && target.status !== "publishing") {
      const publishedCount = target.checkpoint ?? 0;
      const status =
        target.status === "published"
          ? "published"
          : target.status === "partial"
            ? "partial_published"
            : "failed";

      return NextResponse.json({
        success: status === "published",
        status,
        targetId,
        publishedCount,
        total: tweets.length,
        failedAtIndex: status === "published" ? null : publishedCount,
        primaryPostId: target.provider_post_id,
        postUrl: target.provider_url,
        username: account.username,
        error: target.error_message,
        duplicate: true,
      });
    }

    if (target.status === "publishing") {
      return NextResponse.json(
        {
          success: true,
          status: "publishing",
          targetId,
          publishedCount: target.checkpoint ?? 0,
          total: tweets.length,
          username: account.username,
        },
        { status: 202 },
      );
    }

    await kickTarget(targetId);

    return NextResponse.json(
      {
        success: true,
        status: "publishing",
        targetId,
        publishedCount: 0,
        total: tweets.length,
        username: account.username,
      },
      { status: 202 },
    );
  } catch (error) {
    return apiErrorResponse(error, "threads-publish", 500);
  }
}

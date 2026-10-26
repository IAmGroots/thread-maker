import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentWorkspace } from "@/lib/workspace/current";
import { resolveContentItem } from "@/lib/content/items";
import {
  scheduleRequestSchema,
  scheduleDeleteSchema,
  scheduleRetrySchema,
} from "@/lib/validations/threads";
import { apiErrorResponse } from "@/lib/security/apiError";
import { mediaBelongsToWorkspace } from "@/lib/media/access";
import {
  contentFingerprint,
  scheduleIdempotencyKey,
} from "@/lib/threads/idempotency";
import type { TargetStatus } from "@/types/database";

function toLegacyStatus(status: TargetStatus): string {
  return status === "partial" ? "partial_published" : status;
}

/** List the workspace's targets, newest first. */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const params = new URL(request.url).searchParams;
    const limitParam = Number(params.get("limit") ?? 200);
    const offsetParam = Number(params.get("offset") ?? 0);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(Math.trunc(limitParam), 1), 500)
      : 200;
    const offset = Number.isFinite(offsetParam)
      ? Math.max(Math.trunc(offsetParam), 0)
      : 0;

    const { data: targets, error } = await supabase
      .from("post_targets")
      .select(
        "id, social_account_id, content_item_id, status, scheduled_for, provider_post_id, error_message, published_at, attempts, created_at, content_override",
      )
      .eq("workspace_id", workspace.id)
      .neq("status", "canceled")
      .order("scheduled_for", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);

    const contentIds = Array.from(
      new Set((targets ?? []).map((row) => row.content_item_id)),
    );

    const legacyByContent = new Map<string, string | null>();
    if (contentIds.length > 0) {
      const { data: items, error: itemError } = await supabase
        .from("content_items")
        .select("id, legacy_saved_thread_id")
        .in("id", contentIds);

      if (itemError) throw new Error(itemError.message);

      (items ?? []).forEach((item) => {
        legacyByContent.set(item.id, item.legacy_saved_thread_id);
      });
    }

    const posts = (targets ?? []).map((target) => {
      const override = target.content_override as {
        segments?: unknown;
      } | null;
      const preview = Array.isArray(override?.segments)
        ? String(override.segments[0] ?? "").slice(0, 140)
        : "";

      return {
        id: target.id,
        threads_account_id: target.social_account_id,
        saved_thread_id: legacyByContent.get(target.content_item_id) ?? null,
        status: toLegacyStatus(target.status),
        scheduled_for: target.scheduled_for,
        threads_post_id: target.provider_post_id,
        error_message: target.error_message,
        published_at: target.published_at,
        attempts: target.attempts,
        created_at: target.created_at,
        preview,
      };
    });

    return NextResponse.json({ success: true, posts });
  } catch (error) {
    return apiErrorResponse(error, "threads-schedule-list", 500);
  }
}

/** Create a scheduled target. */
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
    const parsed = scheduleRequestSchema.safeParse(raw);
    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    const { accountId, savedThreadId, tweets, scheduledFor, mediaId } = parsed.data;
    const admin = createAdminClient();

    const { data: account, error: accountError } = await admin
      .from("social_accounts")
      .select("id, status")
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
    const idempotencyKey = scheduleIdempotencyKey(
      fingerprint,
      accountId,
      scheduledFor,
      mediaId,
    );

    const { data: targetId, error: createError } = await admin.rpc(
      "create_post_target",
      {
        p_workspace: workspace.id,
        p_content_item: contentItemId,
        p_social_account: accountId,
        p_scheduled_for: scheduledFor,
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

    return NextResponse.json({
      success: true,
      post: { id: targetId, status: "scheduled", scheduled_for: scheduledFor },
    });
  } catch (error) {
    return apiErrorResponse(error, "threads-schedule", 500);
  }
}

/** Retry a failed target by re-queuing it for the next worker pass. */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const raw = await request.json().catch(() => null);
    const parsed = scheduleRetrySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("post_targets")
      .update({
        status: "scheduled",
        scheduled_for: new Date().toISOString(),
        next_attempt_at: null,
        attempts: 0,
        error_code: null,
        error_message: null,
      })
      .eq("id", parsed.data.id)
      .eq("workspace_id", workspace.id)
      .in("status", ["failed", "partial"])
      .select("id");

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, error: "Target cannot be retried in its current state." },
        { status: 409 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "threads-schedule-retry", 500);
  }
}

/** Cancel a target that has not been published yet. */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const raw = await request.json().catch(() => null);
    const parsed = scheduleDeleteSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("post_targets")
      .update({ status: "canceled" })
      .eq("id", parsed.data.id)
      .eq("workspace_id", workspace.id)
      .in("status", ["scheduled", "failed", "draft", "partial"])
      .select("id");

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, error: "Target cannot be canceled in its current state." },
        { status: 409 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "threads-schedule-delete", 500);
  }
}

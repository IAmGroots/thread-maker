import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentWorkspace } from "@/lib/workspace/current";
import { kickTarget } from "@/lib/publish/kick";
import { apiErrorResponse } from "@/lib/security/apiError";
import { rescheduleRequestSchema } from "@/lib/validations/threads";

const actionSchema = z.object({
  action: z.enum(["retry", "publish_now"]),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function loadTarget(id: string) {
  const supabase = await createClient();
  const workspace = await getCurrentWorkspace();
  if (!workspace) return { supabase, workspace: null, target: null };
  if (!z.string().uuid().safeParse(id).success) {
    return { supabase, workspace, target: null };
  }

  const { data: target, error } = await supabase
    .from("post_targets")
    .select("id, workspace_id, status, scheduled_for, provider_post_id")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return { supabase, workspace, target };
}

/** Poll the progress of a target. Used while a publish is in flight. */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { workspace, target } = await loadTarget(id);

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }
    if (!target) {
      return NextResponse.json(
        { success: false, error: "Target not found" },
        { status: 404 },
      );
    }

    const admin = createAdminClient();
    const { data: detail, error } = await admin
      .from("post_targets")
      .select(
        "status, checkpoint, provider_post_id, provider_url, error_message, attempts, content_override",
      )
      .eq("id", target.id)
      .single();

    if (error) throw new Error(error.message);

    const override = detail.content_override as { segments?: unknown } | null;
    const total = Array.isArray(override?.segments)
      ? override.segments.length
      : null;

    const publishedCount = detail.checkpoint ?? 0;
    const status =
      detail.status === "partial"
        ? "partial_published"
        : detail.status;

    return NextResponse.json({
      success: detail.status === "published",
      status,
      targetId: target.id,
      publishedCount,
      total,
      failedAtIndex:
        detail.status === "published" ? null : publishedCount,
      primaryPostId: detail.provider_post_id,
      postUrl: detail.provider_url,
      error: detail.error_message,
      attempts: detail.attempts,
      done: ["published", "partial", "failed", "canceled"].includes(detail.status),
    });
  } catch (error) {
    return apiErrorResponse(error, "target-status", 500);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { workspace, target } = await loadTarget(id);

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }
    if (!target) {
      return NextResponse.json(
        { success: false, error: "Target not found" },
        { status: 404 },
      );
    }

    const parsed = rescheduleRequestSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("post_targets")
      .update({
        scheduled_for: new Date(parsed.data.scheduledFor).toISOString(),
        next_attempt_at: null,
        error_code: null,
        error_message: null,
        status: "scheduled",
      })
      .eq("id", target.id)
      .eq("workspace_id", workspace.id)
      // A publishing target belongs to the worker; moving it would race with
      // the chain that is currently being published.
      .in("status", ["scheduled", "failed", "partial", "draft"])
      .select("id");

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, error: "Target cannot be rescheduled in its current state." },
        { status: 409 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "target-reschedule", 500);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { workspace, target } = await loadTarget(id);

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }
    if (!target) {
      return NextResponse.json(
        { success: false, error: "Target not found" },
        { status: 404 },
      );
    }

    const parsed = actionSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid action" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    if (parsed.data.action === "retry") {
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
        .eq("id", target.id)
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
      return NextResponse.json({ success: true, status: "scheduled" });
    }

    // publish_now: make it due, then hand it to the background worker.
    const { data, error: updateError } = await admin
      .from("post_targets")
      .update({
        status: "scheduled",
        scheduled_for: new Date().toISOString(),
        next_attempt_at: null,
      })
      .eq("id", target.id)
      .eq("workspace_id", workspace.id)
      .in("status", ["scheduled", "failed", "partial", "draft"])
      .select("id");

    if (updateError) throw new Error(updateError.message);
    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, error: "Target cannot be published in its current state." },
        { status: 409 },
      );
    }

    await kickTarget(target.id);

    return NextResponse.json(
      {
        success: true,
        status: "publishing",
        targetId: target.id,
      },
      { status: 202 },
    );
  } catch (error) {
    return apiErrorResponse(error, "target-action", 500);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { workspace, target } = await loadTarget(id);

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }
    if (!target) {
      return NextResponse.json(
        { success: false, error: "Target not found" },
        { status: 404 },
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("post_targets")
      .update({ status: "canceled" })
      .eq("id", target.id)
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
    return apiErrorResponse(error, "target-cancel", 500);
  }
}

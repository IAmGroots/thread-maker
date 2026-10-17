import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scheduleRequestSchema, scheduleDeleteSchema, scheduleRetrySchema } from "@/lib/validations/threads";
import { apiErrorResponse } from "@/lib/security/apiError";
import type { Json } from "@/types/database";

/** List the user's scheduled posts, newest first. */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("scheduled_posts")
      .select(
        "id, threads_account_id, saved_thread_id, status, scheduled_for, threads_post_id, error_message, published_at, attempts, created_at",
      )
      .eq("user_id", user.id)
      .order("scheduled_for", { ascending: true });

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, posts: data ?? [] });
  } catch (error) {
    return apiErrorResponse(error, "threads-schedule-list", 500);
  }
}

/** Create a scheduled post. */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const raw = await request.json();
    const parsed = scheduleRequestSchema.safeParse(raw);
    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    const { accountId, savedThreadId, tweets, scheduledFor } = parsed.data;

    // Confirm the account belongs to the user and is active.
    const { data: account, error: accountError } = await supabase
      .from("threads_accounts")
      .select("id, is_active")
      .eq("id", accountId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (accountError) throw new Error(accountError.message);
    if (!account || !account.is_active) {
      return NextResponse.json(
        { success: false, error: "Threads account not found or inactive" },
        { status: 404 },
      );
    }

    const { data, error } = await supabase
      .from("scheduled_posts")
      .insert({
        user_id: user.id,
        threads_account_id: accountId,
        saved_thread_id: savedThreadId ?? null,
        reply_chain: tweets as unknown as Json,
        scheduled_for: scheduledFor,
        status: "scheduled",
      })
      .select("id, status, scheduled_for")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, post: data });
  } catch (error) {
    return apiErrorResponse(error, "threads-schedule", 500);
  }
}

/** Retry a failed scheduled post by re-queuing it for the next cron pass. */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const raw = await request.json();
    const parsed = scheduleRetrySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
    }

    const { error } = await supabase
      .from("scheduled_posts")
      .update({
        status: "scheduled",
        scheduled_for: new Date().toISOString(),
        attempts: 0,
        error_message: null,
      })
      .eq("id", parsed.data.id)
      .eq("user_id", user.id)
      .in("status", ["failed", "partial_published"]);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "threads-schedule-retry", 500);
  }
}

/** Cancel (delete) a scheduled post that has not been published yet. */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const raw = await request.json();
    const parsed = scheduleDeleteSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
    }

    // Only cancel posts that have not been published.
    const { error } = await supabase
      .from("scheduled_posts")
      .delete()
      .eq("id", parsed.data.id)
      .eq("user_id", user.id)
      .in("status", ["scheduled", "failed", "draft"]);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "threads-schedule-delete", 500);
  }
}

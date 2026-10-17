import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/security/apiError";

/**
 * Lists the current user's connected Threads accounts. When `accountId` is
 * given, also returns the ids of saved threads already published to that
 * account, so the Saved page can show a per-account "already posted" badge.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const accountId = new URL(request.url).searchParams.get("accountId");

    const { data: accounts, error } = await supabase
      .from("threads_accounts")
      .select("id, username, token_expires_at, connected_at")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("connected_at", { ascending: false });

    if (error) throw new Error(error.message);

    let publishedThreadIds: string[] = [];
    if (accountId) {
      const { data: publishes, error: publishError } = await supabase
        .from("thread_publishes")
        .select("saved_thread_id, status")
        .eq("user_id", user.id)
        .eq("threads_account_id", accountId)
        .in("status", ["published", "partial_published"])
        .not("saved_thread_id", "is", null);

      if (publishError) throw new Error(publishError.message);
      publishedThreadIds = (publishes ?? [])
        .map((row) => row.saved_thread_id)
        .filter((id): id is string => Boolean(id));
    }

    return NextResponse.json({
      success: true,
      accounts: accounts ?? [],
      publishedThreadIds,
    });
  } catch (error) {
    return apiErrorResponse(error, "threads-accounts", 500);
  }
}

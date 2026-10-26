import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace/current";
import { listAccounts } from "@/lib/social/accounts";
import { apiErrorResponse } from "@/lib/security/apiError";

/**
 * Lists the workspace's connected accounts. When `accountId` is given, also
 * returns the ids of saved threads already published to that account, so the
 * Saved page can show a per-account "already posted" badge.
 */
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

    const accountId = new URL(request.url).searchParams.get("accountId");
    const accounts = await listAccounts(supabase, workspace.id);

    let publishedThreadIds: string[] = [];

    if (accountId) {
      const { data: targets, error: targetError } = await supabase
        .from("post_targets")
        .select("content_item_id")
        .eq("workspace_id", workspace.id)
        .eq("social_account_id", accountId)
        .in("status", ["published", "partial"]);

      if (targetError) throw new Error(targetError.message);

      const contentIds = Array.from(
        new Set((targets ?? []).map((row) => row.content_item_id)),
      );

      if (contentIds.length > 0) {
        const { data: items, error: itemError } = await supabase
          .from("content_items")
          .select("legacy_saved_thread_id")
          .in("id", contentIds)
          .not("legacy_saved_thread_id", "is", null);

        if (itemError) throw new Error(itemError.message);

        publishedThreadIds = (items ?? [])
          .map((row) => row.legacy_saved_thread_id)
          .filter((id): id is string => Boolean(id));
      }
    }

    return NextResponse.json({
      success: true,
      accounts,
      publishedThreadIds,
    });
  } catch (error) {
    return apiErrorResponse(error, "threads-accounts", 500);
  }
}

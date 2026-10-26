import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace/current";
import { listLibraryPage } from "@/lib/storage/library-server";
import { exportToJSON, exportToTXT } from "@/lib/storage/localStorage";
import { apiErrorResponse } from "@/lib/security/apiError";
import type { SavedThread } from "@/types/thread";

const PAGE_SIZE = 50;
const MAX_EXPORT = 1000;

/**
 * Export the whole (filtered) library, not just the pages the browser has
 * loaded. The client never has to fetch every page itself.
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

    const params = new URL(request.url).searchParams;
    const query = (params.get("query") ?? "").slice(0, 200);
    const format = params.get("format") === "txt" ? "txt" : "json";

    const threads: SavedThread[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore && threads.length < MAX_EXPORT) {
      const page = await listLibraryPage(supabase, workspace.id, {
        query,
        limit: PAGE_SIZE,
        offset,
      });

      threads.push(...page.threads);
      hasMore = page.hasMore;
      offset += page.threads.length;
      if (page.threads.length === 0) break;
    }

    const body =
      format === "txt" ? exportToTXT(threads) : exportToJSON(threads);
    const extension = format === "txt" ? "txt" : "json";
    const contentType =
      format === "txt" ? "text/plain; charset=utf-8" : "application/json";

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="threads-${Date.now()}.${extension}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return apiErrorResponse(error, "library-export", 500);
  }
}

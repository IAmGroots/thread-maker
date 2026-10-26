import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace/current";
import { listLibraryPage } from "@/lib/storage/library-server";
import { apiErrorResponse } from "@/lib/security/apiError";

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
    const limitParam = Number(params.get("limit") ?? 20);
    const offsetParam = Number(params.get("offset") ?? 0);

    const page = await listLibraryPage(supabase, workspace.id, {
      query,
      limit: Number.isFinite(limitParam) ? limitParam : 20,
      offset: Number.isFinite(offsetParam) ? offsetParam : 0,
    });

    return NextResponse.json({ success: true, ...page });
  } catch (error) {
    return apiErrorResponse(error, "library-list", 500);
  }
}

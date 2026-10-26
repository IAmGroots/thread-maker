import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace/current";
import { apiErrorResponse } from "@/lib/security/apiError";

export async function POST() {
  try {
    const supabase = await createClient();
    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const { error } = await supabase.rpc("cancel_subscription");
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "billing-cancel", 500);
  }
}

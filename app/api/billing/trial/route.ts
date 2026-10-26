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

    const { data, error } = await supabase.rpc("start_creator_trial");
    if (error) {
      const used = error.message.includes("trial already used");
      const active = error.message.includes("subscription already active");
      return NextResponse.json(
        {
          success: false,
          error: used
            ? "Trial already used"
            : active
              ? "A paid subscription is already active"
              : "Could not start the trial",
          code: used ? "trial_used" : active ? "subscription_active" : "trial_failed",
        },
        { status: used || active ? 409 : 500 },
      );
    }

    return NextResponse.json({ success: true, trialEndsAt: data });
  } catch (error) {
    return apiErrorResponse(error, "billing-trial", 500);
  }
}

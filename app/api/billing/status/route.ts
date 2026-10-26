import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace/current";
import {
  PLAN_LIMITS,
  PLAN_PRICES_IDR,
  PLAN_PRICES_SEMIANNUAL_IDR,
  PAID_PLAN_IDS,
} from "@/lib/billing/credits";
import { getSubscription, listInvoices } from "@/lib/billing/subscription";
import { getUsageSnapshot } from "@/lib/billing/usage";
import { apiErrorResponse } from "@/lib/security/apiError";

export async function GET() {
  try {
    const supabase = await createClient();
    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const [subscription, invoices, usage] = await Promise.all([
      getSubscription(supabase, workspace.id),
      listInvoices(supabase, workspace.id),
      getUsageSnapshot(supabase, workspace.id, workspace.plan),
    ]);

    return NextResponse.json({
      success: true,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        plan: workspace.plan,
        timezone: workspace.timezone,
        trialUsed: workspace.trialUsed,
      },
      subscription,
      invoices,
      usage,
      plans: (["free", ...PAID_PLAN_IDS] as const).map((plan) => ({
        id: plan,
        priceMonthly: PLAN_PRICES_IDR[plan],
        priceSemiannual: PLAN_PRICES_SEMIANNUAL_IDR[plan],
        limits: PLAN_LIMITS[plan],
      })),
    });
  } catch (error) {
    return apiErrorResponse(error, "billing-status", 500);
  }
}

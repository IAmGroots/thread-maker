import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentWorkspace } from "@/lib/workspace/current";
import { createPakasirProvider, buildOrderId, methodsForPlan } from "@/lib/billing/pakasir";
import { isPaidPlan } from "@/lib/billing/credits";
import { expireStaleInvoices } from "@/lib/billing/subscription";
import { currentPeriod } from "@/lib/billing/usage";
import { apiErrorResponse } from "@/lib/security/apiError";
import type { PaymentMethod } from "@/lib/billing/types";

const checkoutSchema = z.object({
  plan: z.enum(["starter", "creator", "pro"]),
  // The hosted payment page lets the customer pick QRIS or a virtual account,
  // which keeps one integration path for every plan.
  method: z
    .enum([
      "payment_link",
      "qris",
      "bri_va",
      "bni_va",
      "cimb_niaga_va",
      "danamon_va",
      "maybank_va",
      "bnc_va",
      "bsi_va",
      "muamalat_va",
      "ocbc_va",
    ])
    .default("payment_link"),
});

const MAX_ATTEMPTS = 3;

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

    const parsed = checkoutSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid plan or payment method" },
        { status: 400 },
      );
    }

    const { plan, method } = parsed.data;
    if (!isPaidPlan(plan)) {
      return NextResponse.json(
        { success: false, error: "Unknown plan" },
        { status: 400 },
      );
    }

    // Starter does not offer virtual accounts (the flat fee eats the margin).
    if (
      method !== "payment_link" &&
      !methodsForPlan(plan).includes(method as PaymentMethod)
    ) {
      return NextResponse.json(
        { success: false, error: "Payment method is not available for this plan" },
        { status: 400 },
      );
    }

    // Invoices are service-role only: RLS grants members read access, never
    // write access, so a client cannot mint its own invoice.
    const admin = createAdminClient();

    await expireStaleInvoices(admin, workspace.id);

    const period = currentPeriod();

    // Prices live in SQL so a client cannot pass its own amount.
    const { data: price, error: priceError } = await admin.rpc("plan_price", {
      p_plan: plan,
      p_period: "monthly",
    });
    if (priceError) throw new Error(priceError.message);
    const amount = Number(price ?? 0);
    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Unknown plan price" },
        { status: 400 },
      );
    }

    // Pakasir treats (slug, order_id) as find-or-create, so an attempt number
    // keeps each invoice distinct even within the same month.
    const { count } = await admin
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .like("order_id", `INV-${workspace.id}-${period}-%`);

    const startAttempt = (count ?? 0) + 1;
    const provider = createPakasirProvider();

    let lastError: unknown = null;

    for (let offset = 0; offset < MAX_ATTEMPTS; offset += 1) {
      const orderId = buildOrderId(workspace.id, period, startAttempt + offset);

      const { data: invoice, error: insertError } = await admin
        .from("invoices")
        .insert({
          workspace_id: workspace.id,
          order_id: orderId,
          plan,
          billing_period: "monthly",
          amount,
          status: "pending",
          provider: "pakasir",
          created_by: user.id,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .select("id, order_id, amount")
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          lastError = insertError;
          continue;
        }
        throw new Error(insertError.message);
      }

      try {
        const charge = await provider.createCharge({
          orderId,
          amount,
          method: method as PaymentMethod,
        });

        const { error: updateError } = await admin
          .from("invoices")
          .update({
            provider_txn_id: charge.txnId,
            payment_link: charge.paymentLink ?? null,
            qr_string: charge.qrString ?? null,
            va_number: charge.vaNumber ?? null,
            payment_method: method,
            expires_at: (charge.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000)).toISOString(),
          })
          .eq("id", invoice.id);

        if (updateError) throw new Error(updateError.message);

        return NextResponse.json({
          success: true,
          invoice: {
            id: invoice.id,
            orderId: invoice.order_id,
            plan,
            amount: invoice.amount,
          },
          payment: {
            txnId: charge.txnId,
            paymentLink: charge.paymentLink ?? null,
            qrString: charge.qrString ?? null,
            vaNumber: charge.vaNumber ?? null,
            paymentMethod: method,
            expiresAt: charge.expiresAt ?? null,
            isSandbox: charge.isSandbox,
          },
        });
      } catch (error) {
        lastError = error;

        await admin
          .from("invoices")
          .update({ status: "canceled" })
          .eq("id", invoice.id)
          .eq("status", "pending");
      }
    }

    console.error("[billing] checkout failed", lastError);
    return NextResponse.json(
      { success: false, error: "Could not create a payment. Please try again." },
      { status: 502 },
    );
  } catch (error) {
    return apiErrorResponse(error, "billing-checkout", 500);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPakasirProvider, pakasirSandboxEnabled } from "@/lib/billing/pakasir";
import { apiErrorResponse } from "@/lib/security/apiError";

interface WebhookBody {
  txn_id?: string;
  order_id?: string;
  amount?: number;
}

/**
 * Pakasir calls this after a payment settles. The webhook has no signature, so
 * it is verified in layers:
 *   1. X-Secret compared in constant time.
 *   2. order_id and amount must match a local pending invoice.
 *   3. The transaction is re-read from Pakasir, and only `completed` is applied.
 *   4. apply_paid_invoice is idempotent per order.
 *
 * Middleware skips the origin check for this path because the caller is a
 * server, not a browser.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    let body: WebhookBody;
    try {
      body = JSON.parse(rawBody) as WebhookBody;
    } catch {
      return NextResponse.json(
        { success: false, error: "Malformed body" },
        { status: 400 },
      );
    }

    if (!body.order_id || !body.txn_id || typeof body.amount !== "number") {
      return NextResponse.json(
        { success: false, error: "Missing fields" },
        { status: 400 },
      );
    }

    const provider = createPakasirProvider();

    // Verify the secret and shape before touching the database, so an
    // unauthenticated caller cannot probe which orders exist.
    const signature = await provider.verifyWebhook(request.headers, rawBody, {
      orderId: body.order_id,
      amount: body.amount,
    });

    if (!signature.valid || !signature.payload) {
      console.warn(
        `[billing] rejected webhook for ${body.order_id}: ${signature.reason}`,
      );
      return NextResponse.json(
        { success: false, error: "Verification failed", reason: signature.reason },
        { status: 401 },
      );
    }

    const supabase = createAdminClient();

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, workspace_id, order_id, amount, status")
      .eq("order_id", body.order_id)
      .maybeSingle();

    if (invoiceError) throw new Error(invoiceError.message);
    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Unknown order" },
        { status: 404 },
      );
    }

    if (invoice.amount !== body.amount) {
      return NextResponse.json(
        { success: false, error: "Verification failed", reason: "mismatch" },
        { status: 401 },
      );
    }

    // Do not trust the webhook body alone: confirm the transaction state with
    // the provider before granting access.
    const state = await provider.getStatus(signature.payload.txnId);

    if (state.isSandbox !== pakasirSandboxEnabled()) {
      console.warn(
        `[billing] rejected webhook for ${invoice.order_id}: sandbox mode mismatch`,
      );
      return NextResponse.json(
        { success: false, error: "Verification failed", reason: "sandbox_mismatch" },
        { status: 401 },
      );
    }

    if (
      state.status !== "completed" ||
      state.orderId !== invoice.order_id ||
      state.amount !== invoice.amount
    ) {
      return NextResponse.json(
        { success: true, ignored: true, status: state.status },
        { status: 200 },
      );
    }

    const { data: workspaceId, error: applyError } = await supabase.rpc(
      "apply_paid_invoice",
      {
        p_order_id: invoice.order_id,
        p_txn_id: signature.payload.txnId,
        p_amount: invoice.amount,
        p_is_sandbox: signature.payload.isSandbox,
        p_payload: {
          order_id: invoice.order_id,
          txn_id: signature.payload.txnId,
          completed_at: signature.payload.completedAt?.toISOString() ?? null,
        },
      },
    );

    if (applyError) throw new Error(applyError.message);

    return NextResponse.json({ success: true, workspaceId });
  } catch (error) {
    return apiErrorResponse(error, "billing-webhook", 500);
  }
}

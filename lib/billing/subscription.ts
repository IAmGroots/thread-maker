import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { PlanId } from "@/lib/billing/credits";
import type { BillingPeriod } from "@/lib/billing/periods";

type Client = SupabaseClient<Database>;

export interface SubscriptionState {
  plan: PlanId;
  status: string;
  billingPeriod: BillingPeriod;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  graceUntil: string | null;
}

export interface InvoiceRow {
  id: string;
  order_id: string;
  plan: string;
  billing_period: string;
  amount: number;
  status: string;
  payment_link: string | null;
  qr_string: string | null;
  va_number: string | null;
  payment_method: string | null;
  expires_at: string | null;
  paid_at: string | null;
  created_at: string;
}

export async function getSubscription(
  client: Client,
  workspaceId: string,
): Promise<SubscriptionState | null> {
  const { data, error } = await client
    .from("subscriptions")
    .select(
      "plan, status, billing_period, current_period_start, current_period_end, grace_until",
    )
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    plan: data.plan as PlanId,
    status: data.status,
    billingPeriod: data.billing_period as BillingPeriod,
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
    graceUntil: data.grace_until,
  };
}

export async function listInvoices(
  client: Client,
  workspaceId: string,
  limit = 12,
): Promise<InvoiceRow[]> {
  const { data, error } = await client
    .from("invoices")
    .select(
      "id, order_id, plan, billing_period, amount, status, payment_link, qr_string, va_number, payment_method, expires_at, paid_at, created_at",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Mark pending invoices whose Pakasir transaction can no longer be paid. */
export async function expireStaleInvoices(
  client: Client,
  workspaceId: string,
): Promise<void> {
  const { error } = await client
    .from("invoices")
    .update({ status: "expired" })
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString());

  if (error) throw new Error(error.message);
}

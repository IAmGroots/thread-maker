-- =============================================================================
-- Migration: 0011_billing_payment_details
-- Persist the payment details Pakasir returns so the UI can always show a way
-- to pay (payment link, QR string, or virtual account number), and fix renewal
-- for a canceled subscription whose paid period has not ended yet.
--
-- Idempotent: safe to push repeatedly with `npm run db:push`.
-- =============================================================================

alter table public.invoices
  add column if not exists qr_string text;
alter table public.invoices
  add column if not exists va_number text;
alter table public.invoices
  add column if not exists payment_method text;

-- Renewal starts where the current paid period ends, even when the customer
-- already pressed cancel. Paying early must never cost days.
create or replace function public.apply_paid_invoice(
  p_order_id text,
  p_txn_id text,
  p_amount integer,
  p_is_sandbox boolean,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice   public.invoices%rowtype;
  v_start     timestamptz;
  v_end       timestamptz;
  v_interval  interval;
begin
  select * into v_invoice
  from public.invoices
  where order_id = p_order_id
  for update;

  if not found then
    raise exception 'invoice % not found', p_order_id;
  end if;

  if v_invoice.amount <> p_amount then
    raise exception 'amount mismatch for %: expected %, got %',
      p_order_id, v_invoice.amount, p_amount;
  end if;

  if v_invoice.status = 'paid' then
    return v_invoice.workspace_id;
  end if;

  insert into public.payment_events (
    provider, provider_txn_id, order_id, amount, status, is_sandbox, payload
  )
  values (
    'pakasir', p_txn_id, p_order_id, p_amount, 'completed',
    coalesce(p_is_sandbox, false), coalesce(p_payload, '{}'::jsonb)
  )
  on conflict (provider_txn_id) do nothing;

  update public.invoices
  set status = 'paid',
      provider_txn_id = p_txn_id,
      paid_at = now()
  where id = v_invoice.id;

  select greatest(s.current_period_end, now()) into v_start
  from public.subscriptions s
  where s.workspace_id = v_invoice.workspace_id
    and s.status in ('active', 'trialing', 'canceled', 'past_due');

  if v_start is null or v_start < now() then
    v_start := now();
  end if;

  v_interval := case v_invoice.billing_period
    when 'semiannual' then interval '6 months'
    else interval '1 month'
  end;

  v_end := v_start + v_interval;

  insert into public.subscriptions (
    workspace_id, plan, billing_period, status,
    current_period_start, current_period_end, grace_until
  )
  values (
    v_invoice.workspace_id, v_invoice.plan, v_invoice.billing_period, 'active',
    v_start, v_end, v_end + interval '3 days'
  )
  on conflict (workspace_id) do update
  set plan = excluded.plan,
      billing_period = excluded.billing_period,
      status = 'active',
      current_period_start = excluded.current_period_start,
      current_period_end = excluded.current_period_end,
      grace_until = excluded.grace_until,
      reminder_7_sent_at = null,
      reminder_1_sent_at = null,
      updated_at = now();

  update public.workspaces
  set plan = v_invoice.plan,
      updated_at = now()
  where id = v_invoice.workspace_id;

  return v_invoice.workspace_id;
end;
$$;

revoke all on function public.apply_paid_invoice(text, text, integer, boolean, jsonb)
  from public, authenticated, anon;
grant execute on function public.apply_paid_invoice(text, text, integer, boolean, jsonb)
  to service_role;

-- =============================================================================
-- Migration: 0006_billing
-- Subscriptions, invoices, and payment events for Pakasir.
--
-- Billing is prepaid per period: an invoice is created for one month (or six),
-- the customer pays on Pakasir, and a verified webhook extends the period.
-- There is no auto-charge, so expiry is handled by expire_due_subscriptions().
--
-- Idempotent: safe to push repeatedly with `npm run db:push`.
-- =============================================================================

alter table public.workspaces
  add column if not exists trial_used boolean not null default false;

create table if not exists public.subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null unique references public.workspaces (id) on delete cascade,
  provider             text not null default 'pakasir',
  plan                 text not null check (plan in ('free', 'starter', 'creator', 'pro')),
  billing_period       text not null default 'monthly'
    check (billing_period in ('monthly', 'semiannual')),
  status               text not null default 'active'
    check (status in ('trialing', 'active', 'past_due', 'canceled', 'expired')),
  current_period_start timestamptz not null default now(),
  current_period_end   timestamptz not null,
  grace_until          timestamptz,
  reminder_7_sent_at   timestamptz,
  reminder_1_sent_at   timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Columns added after the first version of this table.
alter table public.subscriptions
  add column if not exists reminder_7_sent_at timestamptz;
alter table public.subscriptions
  add column if not exists reminder_1_sent_at timestamptz;

create table if not exists public.invoices (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces (id) on delete cascade,
  order_id         text not null unique,
  plan             text not null check (plan in ('starter', 'creator', 'pro')),
  billing_period   text not null default 'monthly'
    check (billing_period in ('monthly', 'semiannual')),
  amount           integer not null check (amount > 0),
  status           text not null default 'pending'
    check (status in ('pending', 'paid', 'expired', 'canceled')),
  provider         text not null default 'pakasir',
  provider_txn_id  text,
  payment_link     text,
  expires_at       timestamptz,
  paid_at          timestamptz,
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now()
);

create index if not exists idx_invoices_workspace
  on public.invoices (workspace_id, created_at desc);

create table if not exists public.payment_events (
  id               uuid primary key default gen_random_uuid(),
  provider         text not null default 'pakasir',
  provider_txn_id  text not null unique,
  order_id         text not null,
  amount           integer not null,
  status           text not null,
  is_sandbox       boolean not null default false,
  payload          jsonb not null default '{}'::jsonb,
  processed_at     timestamptz not null default now()
);

-- =============================================================================
-- PLAN PRICES (server-side, never taken from the client)
-- Keep in sync with PLAN_PRICES_IDR in lib/billing/credits.ts.
-- =============================================================================

create or replace function public.plan_price(p_plan text, p_period text default 'monthly')
returns integer
language sql
immutable
as $$
  select case p_plan
    when 'starter' then case p_period when 'semiannual' then 245000 else 49000 end
    when 'creator' then case p_period when 'semiannual' then 445000 else 89000 end
    when 'pro' then case p_period when 'semiannual' then 745000 else 149000 end
    else 0
  end;
$$;

-- =============================================================================
-- APPLY A PAID INVOICE
-- Idempotent: a retried webhook for the same order changes nothing twice.
-- =============================================================================

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

  -- Already applied: return the workspace without extending twice.
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

  -- Renewal starts where the current paid period ends, not today, so paying
  -- early never costs the customer days.
  select greatest(s.current_period_end, now()) into v_start
  from public.subscriptions s
  where s.workspace_id = v_invoice.workspace_id
    and s.status in ('active', 'trialing');

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
      -- A fresh paid period gets its own reminders.
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

revoke all on function public.apply_paid_invoice(text, text, integer, boolean, jsonb) from public;
grant execute on function public.apply_paid_invoice(text, text, integer, boolean, jsonb) to service_role;

-- =============================================================================
-- EXPIRY REMINDERS
-- In-app notifications at 7 days and 1 day before the period ends. Each
-- threshold fires once per subscription, tracked by the reminder columns.
-- =============================================================================

create or replace function public.create_expiry_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub   record;
  v_count integer := 0;
  v_title text;
  v_body  text;
begin
  for v_sub in
    select s.workspace_id, s.plan, s.current_period_end,
           s.reminder_7_sent_at, s.reminder_1_sent_at
    from public.subscriptions s
    where s.status in ('active', 'trialing')
      and s.current_period_end > now()
      and s.current_period_end <= now() + interval '7 days'
  loop
    v_title := null;
    v_body := null;

    if v_sub.current_period_end <= now() + interval '1 day'
       and v_sub.reminder_1_sent_at is null then
      v_title := 'Your plan ends today or tomorrow';
      v_body := format(
        'Your %s plan ends on %s. Renew to keep your current limits.',
        v_sub.plan,
        to_char(v_sub.current_period_end, 'DD Mon YYYY HH24:MI')
      );
    elsif v_sub.reminder_7_sent_at is null then
      v_title := 'Your plan ends this week';
      v_body := format(
        'Your %s plan ends on %s. Renew any time before then; the new period starts where the old one ends.',
        v_sub.plan,
        to_char(v_sub.current_period_end, 'DD Mon YYYY')
      );
    end if;

    if v_title is null then
      continue;
    end if;

    insert into public.notifications (
      workspace_id, user_id, type, title, body, entity_type
    )
    select
      v_sub.workspace_id, m.user_id, 'system', v_title, v_body, 'subscription'
    from public.workspace_members m
    where m.workspace_id = v_sub.workspace_id
      and m.role in ('owner', 'admin');

    update public.subscriptions
    set reminder_7_sent_at = case
          when v_sub.current_period_end <= now() + interval '1 day'
            then coalesce(reminder_7_sent_at, now())
          else now()
        end,
        reminder_1_sent_at = case
          when v_sub.current_period_end <= now() + interval '1 day' then now()
          else reminder_1_sent_at
        end,
        updated_at = now()
    where workspace_id = v_sub.workspace_id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.create_expiry_reminders() from public;
grant execute on function public.create_expiry_reminders() to service_role;

-- =============================================================================
-- EXPIRE SUBSCRIPTIONS
-- Called from the cron. Downgrades to Free after the grace period; content is
-- never deleted.
-- =============================================================================

create or replace function public.expire_due_subscriptions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with expired as (
    update public.subscriptions
    set status = 'expired',
        updated_at = now()
    where status in ('active', 'trialing', 'past_due', 'canceled')
      and coalesce(grace_until, current_period_end) < now()
    returning workspace_id
  )
  update public.workspaces w
  set plan = 'free',
      updated_at = now()
  from expired e
  where w.id = e.workspace_id
    and w.plan <> 'free';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_due_subscriptions() from public;
grant execute on function public.expire_due_subscriptions() to service_role;

-- =============================================================================
-- 7-DAY TRIAL
-- One per workspace. The workspace runs on Creator limits for 7 days, with a
-- 3-day grace before it falls back to Free.
-- =============================================================================

create or replace function public.start_creator_trial()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace uuid;
  v_used      boolean;
  v_plan      text;
  v_end       timestamptz;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select m.workspace_id into v_workspace
  from public.workspace_members m
  where m.user_id = auth.uid()
    and m.role in ('owner', 'admin')
  order by m.created_at
  limit 1;

  if v_workspace is null then
    raise exception 'no workspace';
  end if;

  select trial_used, plan into v_used, v_plan
  from public.workspaces
  where id = v_workspace
  for update;

  if v_used then
    raise exception 'trial already used';
  end if;

  if v_plan <> 'free' then
    raise exception 'subscription already active';
  end if;

  if exists (
    select 1 from public.subscriptions s
    where s.workspace_id = v_workspace
      and s.status in ('active', 'trialing')
  ) then
    raise exception 'subscription already active';
  end if;

  v_end := now() + interval '7 days';

  update public.workspaces
  set trial_used = true,
      plan = 'creator',
      updated_at = now()
  where id = v_workspace;

  insert into public.subscriptions (
    workspace_id, plan, billing_period, status,
    current_period_start, current_period_end, grace_until
  )
  values (
    v_workspace, 'creator', 'monthly', 'trialing',
    now(), v_end, v_end + interval '3 days'
  )
  on conflict (workspace_id) do update
  set plan = 'creator',
      billing_period = 'monthly',
      status = 'trialing',
      current_period_start = now(),
      current_period_end = excluded.current_period_end,
      grace_until = excluded.grace_until,
      reminder_7_sent_at = null,
      reminder_1_sent_at = null,
      updated_at = now();

  return v_end;
end;
$$;

revoke all on function public.start_creator_trial() from public;
grant execute on function public.start_creator_trial() to authenticated;

-- =============================================================================
-- CANCEL
-- Keeps access until the paid period (plus grace) ends, then expires.
-- =============================================================================

create or replace function public.cancel_subscription()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select m.workspace_id into v_workspace
  from public.workspace_members m
  where m.user_id = auth.uid()
    and m.role in ('owner', 'admin')
  order by m.created_at
  limit 1;

  if v_workspace is null then
    raise exception 'no workspace';
  end if;

  update public.subscriptions
  set status = 'canceled',
      updated_at = now()
  where workspace_id = v_workspace
    and status in ('active', 'trialing');
end;
$$;

revoke all on function public.cancel_subscription() from public;
grant execute on function public.cancel_subscription() to authenticated;

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.subscriptions enable row level security;
alter table public.invoices enable row level security;
alter table public.payment_events enable row level security;

drop policy if exists "Members can read subscription" on public.subscriptions;
create policy "Members can read subscription"
  on public.subscriptions for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists "Members can read invoices" on public.invoices;
create policy "Members can read invoices"
  on public.invoices for select
  using (public.is_workspace_member(workspace_id));

-- payment_events has no policy: service_role only.

-- =============================================================================
-- updated_at
-- =============================================================================

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.set_updated_at();

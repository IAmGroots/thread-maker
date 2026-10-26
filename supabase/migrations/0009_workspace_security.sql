-- =============================================================================
-- Migration: 0009_workspace_security
-- Hardening for billing fields, usage RPCs, token exposure, tenant consistency,
-- and content status.
--
-- Idempotent: safe to push repeatedly with `npm run db:push`.
-- =============================================================================

-- =============================================================================
-- 1. BILLING FIELDS ARE SERVICE-ROLE ONLY
-- The workspace owner must not be able to change plan or reset the trial.
-- Security-definer RPCs (apply_paid_invoice, start_creator_trial,
-- expire_due_subscriptions) run as the function owner, so they still work.
-- =============================================================================

create or replace function public.protect_workspace_billing_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.plan is distinct from old.plan then
      raise exception 'workspaces.plan is managed by billing';
    end if;
    if new.trial_used is distinct from old.trial_used then
      raise exception 'workspaces.trial_used is managed by billing';
    end if;
    if new.slug is distinct from old.slug then
      raise exception 'workspaces.slug is immutable';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_workspace_billing_fields on public.workspaces;
create trigger protect_workspace_billing_fields
  before update on public.workspaces
  for each row execute function public.protect_workspace_billing_fields();

revoke update on public.workspaces from authenticated, anon;
grant update (name, timezone, updated_at) on public.workspaces to authenticated;

-- =============================================================================
-- 2. USAGE RPCs ARE SERVICE-ROLE ONLY
-- A client must never refund its own credits or spend another workspace's.
-- =============================================================================

create or replace function public.consume_usage(
  p_workspace uuid,
  p_period text,
  p_metric text,
  p_amount bigint
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_value bigint;
  v_limit bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'usage functions are service-role only';
  end if;

  if p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  select public.plan_limit(w.plan, p_metric) into v_limit
  from public.workspaces w
  where w.id = p_workspace;

  if v_limit is null then
    return null;
  end if;

  insert into public.usage_counters (workspace_id, period, metric, value)
  values (p_workspace, p_period, p_metric, 0)
  on conflict (workspace_id, period, metric) do nothing;

  update public.usage_counters
  set value = value + p_amount,
      updated_at = now()
  where workspace_id = p_workspace
    and period = p_period
    and metric = p_metric
    and value + p_amount <= v_limit
  returning value into v_value;

  return v_value;
end;
$$;

create or replace function public.refund_usage(
  p_workspace uuid,
  p_period text,
  p_metric text,
  p_amount bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'usage functions are service-role only';
  end if;

  if p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  update public.usage_counters
  set value = greatest(0, value - p_amount),
      updated_at = now()
  where workspace_id = p_workspace
    and period = p_period
    and metric = p_metric;
end;
$$;

revoke all on function public.consume_usage(uuid, text, text, bigint)
  from public, authenticated, anon;
revoke all on function public.refund_usage(uuid, text, text, bigint)
  from public, authenticated, anon;
grant execute on function public.consume_usage(uuid, text, text, bigint)
  to service_role;
grant execute on function public.refund_usage(uuid, text, text, bigint)
  to service_role;

-- =============================================================================
-- 3. SOCIAL TOKENS NEVER LEAVE THE SERVER
-- Column privileges hide the encrypted token columns from the browser while
-- keeping the metadata the UI needs.
-- =============================================================================

revoke select on public.social_accounts from authenticated, anon;
grant select (
  id, workspace_id, provider, provider_account_id, username, display_name,
  avatar_url, token_expires_at, scopes, status, metadata, connected_by,
  created_at, updated_at
) on public.social_accounts to authenticated;

-- Tokens are cleared on disconnect, so the column must accept null.
alter table public.social_accounts
  alter column access_token_enc drop not null;

-- =============================================================================
-- 4. TENANT CONSISTENCY FOR TARGETS AND MEDIA
-- A target can only reference content and an account in the same workspace,
-- and linked media must belong to that workspace too.
-- =============================================================================

create or replace function public.assert_post_target_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.content_items ci
    join public.social_accounts sa on sa.id = new.social_account_id
    where ci.id = new.content_item_id
      and ci.workspace_id = new.workspace_id
      and sa.workspace_id = new.workspace_id
  ) then
    raise exception 'post target workspace mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists assert_post_target_workspace on public.post_targets;
create trigger assert_post_target_workspace
  before insert or update of workspace_id, content_item_id, social_account_id
  on public.post_targets
  for each row execute function public.assert_post_target_workspace();

create or replace function public.assert_post_target_media_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.post_targets pt
    join public.media_assets ma on ma.id = new.media_asset_id
    where pt.id = new.post_target_id
      and ma.workspace_id = pt.workspace_id
  ) then
    raise exception 'post target media workspace mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists assert_post_target_media_workspace on public.post_target_media;
create trigger assert_post_target_media_workspace
  before insert or update on public.post_target_media
  for each row execute function public.assert_post_target_media_workspace();

-- =============================================================================
-- 5. WRITES GO THROUGH THE SERVER
-- All sensitive tables are written by route handlers with the service role
-- after authentication and workspace checks. Direct browser writes are denied.
-- =============================================================================

drop policy if exists "Editors can write targets" on public.post_targets;
drop policy if exists "Editors can write target media" on public.post_target_media;
drop policy if exists "Editors can write media" on public.media_assets;
drop policy if exists "Editors can write content items" on public.content_items;
drop policy if exists "Editors can write content segments" on public.content_segments;
drop policy if exists "Admins can manage social accounts" on public.social_accounts;
drop policy if exists "Workspace media insert" on storage.objects;
drop policy if exists "Workspace media delete" on storage.objects;

-- =============================================================================
-- 6. CONTENT STATUS WITH ZERO TARGETS IS DRAFT, NOT FAILED
-- =============================================================================

create or replace function public.refresh_content_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_content_id uuid;
  v_status     text;
begin
  if tg_op = 'DELETE' then
    v_content_id := old.content_item_id;
  else
    v_content_id := new.content_item_id;
  end if;

  select case
    when count(*) = 0 then 'draft'
    when count(*) filter (where status in ('scheduled', 'publishing')) > 0 then 'scheduled'
    when count(*) filter (where status = 'partial') > 0 then 'partial'
    when count(*) filter (where status = 'failed') = count(*) then 'failed'
    when count(*) filter (where status = 'published') = count(*) then 'published'
    else 'draft'
  end
  into v_status
  from public.post_targets
  where content_item_id = v_content_id;

  update public.content_items
  set status = coalesce(v_status, 'draft'), updated_at = now()
  where id = v_content_id;

  return null;
end;
$$;

-- =============================================================================
-- 7. BILLING LOOKUP INDEXES
-- =============================================================================

create index if not exists idx_subscriptions_status_end
  on public.subscriptions (status, current_period_end);

-- Guarded so this migration still works if the analytics migration was skipped
-- by an older remote migration history.
do $$
begin
  if to_regclass('public.notifications') is not null then
    execute 'create index if not exists idx_notifications_created
      on public.notifications (created_at desc)';
  end if;
end;
$$;

-- =============================================================================
-- 8. AGGREGATE MEDIA USAGE
-- Summing in SQL keeps the usage number correct beyond the 200-row list cap.
-- =============================================================================

create or replace function public.media_usage_bytes(p_workspace uuid)
returns bigint
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(size_bytes), 0)::bigint
  from public.media_assets
  where workspace_id = p_workspace;
$$;

grant execute on function public.media_usage_bytes(uuid) to authenticated, service_role;

-- =============================================================================
-- Migration: 0008_analytics_notifications_usage
-- Analytics snapshots, in-app notifications, and plan usage counters.
--
-- Numbered 0008 (not 0005): an earlier `0005_sync_scopes` was already recorded
-- in the remote migration history, so Supabase skipped this file when it still
-- shared version 0005. The SQL is idempotent, so databases that already ran it
-- under 0005 are unaffected.
--
-- Idempotent: safe to push repeatedly with `npm run db:push`.
-- =============================================================================

-- =============================================================================
-- TABLE: analytics_snapshots
-- One row per capture. Dashboards aggregate over a date range instead of
-- mutating a single row, so history is never lost.
-- =============================================================================

create table if not exists public.analytics_snapshots (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspaces (id) on delete cascade,
  social_account_id  uuid not null references public.social_accounts (id) on delete cascade,
  provider_post_id   text not null,
  post_target_id     uuid references public.post_targets (id) on delete set null,
  captured_at        timestamptz not null default now(),
  views              bigint,
  likes              integer,
  comments           integer,
  shares             integer,
  quotes             integer,
  engagement_rate    numeric(6, 4),
  raw                jsonb not null default '{}'::jsonb,
  unique (social_account_id, provider_post_id, captured_at)
);

create index if not exists idx_analytics_workspace
  on public.analytics_snapshots (workspace_id, captured_at desc);

create index if not exists idx_analytics_post
  on public.analytics_snapshots (post_target_id, captured_at desc);

-- =============================================================================
-- TABLE: notifications
-- =============================================================================

create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  type         text not null
    check (type in ('publish_succeeded', 'publish_failed', 'publish_partial', 'account_error', 'system')),
  title        text not null,
  body         text,
  entity_type  text,
  entity_id    uuid,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists idx_notifications_unread
  on public.notifications (user_id, created_at desc)
  where read_at is null;

create index if not exists idx_notifications_user
  on public.notifications (user_id, created_at desc);

-- =============================================================================
-- TABLE: usage_counters
-- period is 'YYYY-MM' in the workspace timezone (UTC for now).
-- =============================================================================

create table if not exists public.usage_counters (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  period       text not null,
  metric       text not null
    check (metric in ('scheduled_posts', 'ai_credits', 'storage_bytes')),
  value        bigint not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (workspace_id, period, metric)
);

/**
 * Plan limits live in SQL so a client can never pass its own ceiling.
 * Keep in sync with lib/billing/credits.ts.
 */
create or replace function public.plan_limit(p_plan text, p_metric text)
returns bigint
language sql
immutable
as $$
  select case p_metric
    when 'scheduled_posts' then case p_plan
      when 'free' then 10
      when 'starter' then 60
      when 'creator' then 200
      when 'pro' then 600
      else 10
    end
    when 'ai_credits' then case p_plan
      when 'free' then 30
      when 'starter' then 150
      when 'creator' then 400
      when 'pro' then 900
      else 30
    end
    when 'storage_bytes' then case p_plan
      when 'free' then 104857600
      when 'starter' then 1073741824
      when 'creator' then 3221225472
      when 'pro' then 8589934592
      else 104857600
    end
    else 0
  end;
$$;

/**
 * Atomically consume units from a counter. The limit is derived from the
 * workspace plan, never from the caller. Returns the new value, or null when
 * the request would exceed the plan.
 */
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

/**
 * Refund units, used when an AI call fails after being counted.
 */
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

revoke all on function public.consume_usage(uuid, text, text, bigint) from public;
revoke all on function public.refund_usage(uuid, text, text, bigint) from public;
grant execute on function public.consume_usage(uuid, text, text, bigint) to authenticated, service_role;
grant execute on function public.refund_usage(uuid, text, text, bigint) to authenticated, service_role;

-- =============================================================================
-- LIBRARY SEARCH
-- Search runs in SQL so the browser never downloads the whole library, and so
-- tweet text can be matched (PostgREST filters cannot cast a jsonb column).
-- =============================================================================

create or replace function public.search_saved_threads(
  p_workspace uuid,
  p_query text,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id               uuid,
  user_id          uuid,
  topic            text,
  format           text,
  style            text,
  tone             text,
  language         text,
  target_audience  text,
  content_goal     text,
  tweets           jsonb,
  settings         jsonb,
  affiliate        jsonb,
  total_tweets     integer,
  total_chars      integer,
  is_favorite      boolean,
  tags             jsonb,
  notes            text,
  created_at       timestamptz,
  updated_at       timestamptz,
  total_count      bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with matches as (
    select st.*
    from public.saved_threads st
    where st.workspace_id = p_workspace
      and (
        coalesce(p_query, '') = ''
        or st.topic ilike '%' || p_query || '%'
        or st.style ilike '%' || p_query || '%'
        or st.tone ilike '%' || p_query || '%'
        or st.notes ilike '%' || p_query || '%'
        or st.tweets::text ilike '%' || p_query || '%'
      )
  )
  select
    m.id, m.user_id, m.topic, m.format, m.style, m.tone, m.language,
    m.target_audience, m.content_goal, m.tweets, m.settings, m.affiliate,
    m.total_tweets, m.total_chars, m.is_favorite, m.tags, m.notes,
    m.created_at, m.updated_at,
    count(*) over () as total_count
  from matches m
  order by m.created_at desc
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
$$;

grant execute on function public.search_saved_threads(uuid, text, integer, integer) to authenticated;

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.analytics_snapshots enable row level security;
alter table public.notifications enable row level security;
alter table public.usage_counters enable row level security;

drop policy if exists "Members can read analytics" on public.analytics_snapshots;
create policy "Members can read analytics"
  on public.analytics_snapshots for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists "Members can read own notifications" on public.notifications;
create policy "Members can read own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists "Members can update own notifications" on public.notifications;
create policy "Members can update own notifications"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Members can read usage" on public.usage_counters;
create policy "Members can read usage"
  on public.usage_counters for select
  using (public.is_workspace_member(workspace_id));

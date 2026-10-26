-- =============================================================================
-- Migration: 0004_workspace_schema_v2
-- Workspace tenancy, social account vault, content model, media, and the
-- Postgres publish queue.
--
-- Design notes:
--   * Additive. Legacy tables (saved_threads, threads_accounts, scheduled_posts)
--     keep working and gain a workspace_id so the current UI does not break.
--   * saved_threads mirrors into content_items/content_segments through a
--     trigger, so the library UI stays the source of truth until Phase 2.
--   * The queue is a set of security-definer functions callable only by
--     service_role.
--
-- Idempotent: safe to push repeatedly with `npm run db:push`.
-- =============================================================================

create extension if not exists pgcrypto;

-- =============================================================================
-- TABLES
-- =============================================================================

create table if not exists public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Workspace',
  slug        text not null unique,
  timezone    text not null default 'Asia/Jakarta',
  plan        text not null default 'free'
    check (plan in ('free', 'starter', 'creator', 'pro')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  role          text not null default 'owner'
    check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at    timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists idx_workspace_members_user
  on public.workspace_members (user_id);

create table if not exists public.social_accounts (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references public.workspaces (id) on delete cascade,
  provider            text not null
    check (provider in ('threads', 'instagram', 'facebook', 'pinterest', 'tiktok')),
  provider_account_id text not null,
  username            text not null,
  display_name        text,
  avatar_url          text,
  access_token_enc    text not null,
  refresh_token_enc   text,
  token_expires_at    timestamptz,
  scopes              text[] not null default '{}',
  status              text not null default 'active'
    check (status in ('active', 'expired', 'revoked', 'error')),
  metadata            jsonb not null default '{}'::jsonb,
  connected_by        uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (workspace_id, provider, provider_account_id)
);

create index if not exists idx_social_accounts_workspace
  on public.social_accounts (workspace_id, provider);

create index if not exists idx_social_accounts_refresh
  on public.social_accounts (token_expires_at)
  where status = 'active';

create table if not exists public.content_items (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references public.workspaces (id) on delete cascade,
  created_by            uuid references auth.users (id) on delete set null,
  title                 text not null default '',
  base_text             text not null default '',
  status                text not null default 'draft'
    check (status in ('draft', 'scheduled', 'published', 'partial', 'failed')),
  tags                  jsonb not null default '[]'::jsonb,
  metadata              jsonb not null default '{}'::jsonb,
  legacy_saved_thread_id uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create unique index if not exists idx_content_items_legacy
  on public.content_items (legacy_saved_thread_id)
  where legacy_saved_thread_id is not null;

create index if not exists idx_content_items_workspace
  on public.content_items (workspace_id, created_at desc);

create table if not exists public.content_segments (
  id              uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items (id) on delete cascade,
  position        integer not null,
  text            text not null,
  created_at      timestamptz not null default now(),
  unique (content_item_id, position)
);

create table if not exists public.media_assets (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  storage_path  text not null unique,
  mime_type     text not null,
  width         integer,
  height        integer,
  duration_ms   integer,
  size_bytes    bigint not null,
  alt_text      text,
  checksum      text,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_media_assets_workspace
  on public.media_assets (workspace_id, created_at desc);

create table if not exists public.post_targets (
  id                     uuid primary key default gen_random_uuid(),
  workspace_id           uuid not null references public.workspaces (id) on delete cascade,
  content_item_id        uuid not null references public.content_items (id) on delete cascade,
  social_account_id      uuid not null references public.social_accounts (id) on delete cascade,
  scheduled_for          timestamptz not null default now(),
  timezone               text not null default 'Asia/Jakarta',
  status                 text not null default 'scheduled'
    check (status in ('draft', 'scheduled', 'publishing', 'published', 'partial', 'failed', 'canceled')),
  content_override       jsonb not null default '{}'::jsonb,
  idempotency_key        text not null unique,
  provider_post_id       text,
  provider_url           text,
  provider_state         jsonb not null default '{}'::jsonb,
  checkpoint             integer not null default 0,
  attempts               integer not null default 0,
  next_attempt_at        timestamptz,
  locked_at              timestamptz,
  error_code             text,
  error_message          text,
  published_at           timestamptz,
  legacy_scheduled_post_id uuid unique,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists idx_post_targets_due
  on public.post_targets (scheduled_for)
  where status = 'scheduled';

create index if not exists idx_post_targets_workspace
  on public.post_targets (workspace_id, scheduled_for desc);

create index if not exists idx_post_targets_content
  on public.post_targets (content_item_id);

create table if not exists public.post_target_media (
  post_target_id uuid not null references public.post_targets (id) on delete cascade,
  media_asset_id uuid not null references public.media_assets (id) on delete cascade,
  position       integer not null default 0,
  primary key (post_target_id, media_asset_id)
);

create table if not exists public.publish_attempts (
  id             uuid primary key default gen_random_uuid(),
  post_target_id uuid not null references public.post_targets (id) on delete cascade,
  attempt        integer not null,
  status         text not null check (status in ('started', 'succeeded', 'failed')),
  request_id     text,
  response       jsonb,
  error_code     text,
  error_message  text,
  started_at     timestamptz not null default now(),
  finished_at    timestamptz
);

create index if not exists idx_publish_attempts_target
  on public.publish_attempts (post_target_id, started_at desc);

-- =============================================================================
-- WORKSPACE HELPERS
-- =============================================================================

create or replace function public.is_workspace_member(
  ws uuid,
  min_role text default 'viewer'
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = ws
      and m.user_id = auth.uid()
      and case min_role
            when 'viewer' then true
            when 'editor' then m.role in ('owner', 'admin', 'editor')
            when 'admin'  then m.role in ('owner', 'admin')
            when 'owner'  then m.role = 'owner'
            else false
          end
  );
$$;

create or replace function public.current_workspace_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.workspace_id
  from public.workspace_members m
  where m.user_id = auth.uid()
  order by m.created_at
  limit 1;
$$;

/**
 * Returns the caller's workspace, creating a personal one on first use.
 * Idempotent: concurrent calls resolve to the same row via the slug.
 */
create or replace function public.ensure_personal_workspace()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_ws   uuid;
  v_name text;
  v_slug text;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select m.workspace_id into v_ws
  from public.workspace_members m
  where m.user_id = v_user
  order by m.created_at
  limit 1;

  if v_ws is not null then
    return v_ws;
  end if;

  select coalesce(nullif(p.full_name, ''), split_part(p.email, '@', 1), 'Workspace')
  into v_name
  from public.profiles p
  where p.id = v_user;

  v_slug := 'ws-' || replace(v_user::text, '-', '');

  insert into public.workspaces (name, slug)
  values (coalesce(v_name, 'Workspace'), v_slug)
  on conflict (slug) do update set updated_at = now()
  returning id into v_ws;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_ws, v_user, 'owner')
  on conflict do nothing;

  return v_ws;
end;
$$;

/** Creates a personal workspace when a new profile appears. */
create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ws uuid;
begin
  if exists (select 1 from public.workspace_members where user_id = new.id) then
    return new;
  end if;

  insert into public.workspaces (name, slug)
  values (
    coalesce(nullif(new.full_name, ''), split_part(new.email, '@', 1), 'Workspace'),
    'ws-' || replace(new.id::text, '-', '')
  )
  on conflict (slug) do update set updated_at = now()
  returning id into v_ws;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_ws, new.id, 'owner')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_profile_created on public.profiles;
create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile();

/** Fills workspace_id on legacy rows inserted without it. */
create or replace function public.fill_workspace_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.workspace_id is null then
    select m.workspace_id into new.workspace_id
    from public.workspace_members m
    where m.user_id = new.user_id
    order by m.created_at
    limit 1;
  end if;
  return new;
end;
$$;

-- =============================================================================
-- LEGACY TABLES: workspace scoping
-- =============================================================================

alter table public.threads_accounts
  add column if not exists workspace_id uuid references public.workspaces (id) on delete cascade;
alter table public.saved_threads
  add column if not exists workspace_id uuid references public.workspaces (id) on delete cascade;
alter table public.scheduled_posts
  add column if not exists workspace_id uuid references public.workspaces (id) on delete cascade;

drop trigger if exists set_threads_accounts_workspace on public.threads_accounts;
create trigger set_threads_accounts_workspace
  before insert on public.threads_accounts
  for each row execute procedure public.fill_workspace_id();

drop trigger if exists set_saved_threads_workspace on public.saved_threads;
create trigger set_saved_threads_workspace
  before insert on public.saved_threads
  for each row execute procedure public.fill_workspace_id();

drop trigger if exists set_scheduled_posts_workspace on public.scheduled_posts;
create trigger set_scheduled_posts_workspace
  before insert on public.scheduled_posts
  for each row execute procedure public.fill_workspace_id();

create index if not exists idx_saved_threads_workspace
  on public.saved_threads (workspace_id, created_at desc);
create index if not exists idx_threads_accounts_workspace
  on public.threads_accounts (workspace_id);
create index if not exists idx_scheduled_posts_workspace
  on public.scheduled_posts (workspace_id);

-- =============================================================================
-- BACKFILL: workspaces for existing users
-- =============================================================================

insert into public.workspaces (name, slug)
select
  coalesce(nullif(p.full_name, ''), split_part(p.email, '@', 1), 'Workspace'),
  'ws-' || replace(p.id::text, '-', '')
from public.profiles p
on conflict (slug) do nothing;

insert into public.workspace_members (workspace_id, user_id, role)
select w.id, p.id, 'owner'
from public.profiles p
join public.workspaces w on w.slug = 'ws-' || replace(p.id::text, '-', '')
on conflict (workspace_id, user_id) do nothing;

update public.saved_threads st
set workspace_id = m.workspace_id
from public.workspace_members m
where m.user_id = st.user_id
  and st.workspace_id is null;

update public.threads_accounts ta
set workspace_id = m.workspace_id
from public.workspace_members m
where m.user_id = ta.user_id
  and ta.workspace_id is null;

update public.scheduled_posts sp
set workspace_id = m.workspace_id
from public.workspace_members m
where m.user_id = sp.user_id
  and sp.workspace_id is null;

-- =============================================================================
-- BACKFILL: social accounts
-- =============================================================================

insert into public.social_accounts (
  workspace_id, provider, provider_account_id, username,
  access_token_enc, token_expires_at, scopes, status, connected_by, created_at
)
select
  ta.workspace_id,
  'threads',
  ta.threads_user_id,
  ta.username,
  ta.access_token,
  ta.token_expires_at,
  array['threads_basic', 'threads_content_publish']::text[],
  case when ta.is_active then 'active' else 'revoked' end,
  ta.user_id,
  ta.connected_at
from public.threads_accounts ta
where ta.workspace_id is not null
on conflict (workspace_id, provider, provider_account_id) do nothing;

-- =============================================================================
-- MIRROR: threads_accounts -> social_accounts
-- Keeps the legacy connect flow working while the new vault is rolled out.
-- =============================================================================

create or replace function public.sync_threads_account_to_social()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace uuid;
begin
  if tg_op = 'DELETE' then
    update public.social_accounts
    set status = 'revoked', updated_at = now()
    where provider = 'threads'
      and provider_account_id = old.threads_user_id
      and (old.workspace_id is null or workspace_id = old.workspace_id);
    return old;
  end if;

  v_workspace := new.workspace_id;
  if v_workspace is null then
    select m.workspace_id into v_workspace
    from public.workspace_members m
    where m.user_id = new.user_id
    order by m.created_at
    limit 1;
  end if;

  if v_workspace is null then
    return new;
  end if;

  insert into public.social_accounts (
    workspace_id, provider, provider_account_id, username,
    access_token_enc, token_expires_at, scopes, status, connected_by, created_at
  )
  values (
    v_workspace,
    'threads',
    new.threads_user_id,
    new.username,
    new.access_token,
    new.token_expires_at,
    array['threads_basic', 'threads_content_publish']::text[],
    case when new.is_active then 'active' else 'revoked' end,
    new.user_id,
    new.connected_at
  )
  on conflict (workspace_id, provider, provider_account_id) do update
  set username = excluded.username,
      access_token_enc = excluded.access_token_enc,
      token_expires_at = excluded.token_expires_at,
      status = excluded.status,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_threads_account_social on public.threads_accounts;
create trigger sync_threads_account_social
  after insert or update or delete on public.threads_accounts
  for each row execute procedure public.sync_threads_account_to_social();

-- =============================================================================
-- MIRROR: saved_threads -> content_items / content_segments
-- =============================================================================

create or replace function public.sync_saved_thread_to_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_content_id uuid;
  v_item       jsonb;
  v_pos        integer := 0;
  v_workspace  uuid;
begin
  if tg_op = 'DELETE' then
    -- A scheduled target outlives its library entry, matching the old
    -- scheduled_posts.saved_thread_id ON DELETE SET NULL behavior.
    if exists (
      select 1
      from public.post_targets pt
      join public.content_items ci on ci.id = pt.content_item_id
      where ci.legacy_saved_thread_id = old.id
        and pt.status in ('scheduled', 'publishing')
    ) then
      update public.content_items
      set legacy_saved_thread_id = null
      where legacy_saved_thread_id = old.id;
    else
      delete from public.content_items where legacy_saved_thread_id = old.id;
    end if;
    return old;
  end if;

  v_workspace := new.workspace_id;
  if v_workspace is null then
    select m.workspace_id into v_workspace
    from public.workspace_members m
    where m.user_id = new.user_id
    order by m.created_at
    limit 1;
  end if;

  if v_workspace is null then
    return new;
  end if;

  select id into v_content_id
  from public.content_items
  where legacy_saved_thread_id = new.id;

  if v_content_id is null then
    insert into public.content_items (
      workspace_id, created_by, title, base_text, status, tags, metadata,
      legacy_saved_thread_id, created_at, updated_at
    )
    values (
      v_workspace,
      new.user_id,
      new.topic,
      '',
      'draft',
      coalesce(new.tags, '[]'::jsonb),
      jsonb_build_object(
        'format', new.format,
        'style', new.style,
        'tone', new.tone,
        'language', new.language,
        'targetAudience', new.target_audience,
        'contentGoal', new.content_goal,
        'settings', new.settings,
        'affiliate', new.affiliate
      ),
      new.id,
      new.created_at,
      new.updated_at
    )
    returning id into v_content_id;
  else
    update public.content_items
    set title = new.topic,
        tags = coalesce(new.tags, '[]'::jsonb),
        metadata = jsonb_build_object(
          'format', new.format,
          'style', new.style,
          'tone', new.tone,
          'language', new.language,
          'targetAudience', new.target_audience,
          'contentGoal', new.content_goal,
          'settings', new.settings,
          'affiliate', new.affiliate
        ),
        updated_at = new.updated_at
    where id = v_content_id;
  end if;

  delete from public.content_segments where content_item_id = v_content_id;

  for v_item in
    select value from jsonb_array_elements(coalesce(new.tweets, '[]'::jsonb))
  loop
    if coalesce(v_item ->> 'content', '') <> '' then
      insert into public.content_segments (content_item_id, position, text)
      values (v_content_id, v_pos, v_item ->> 'content');
    end if;
    v_pos := v_pos + 1;
  end loop;

  return new;
end;
$$;

drop trigger if exists sync_saved_thread_content on public.saved_threads;
create trigger sync_saved_thread_content
  after insert or update or delete on public.saved_threads
  for each row execute procedure public.sync_saved_thread_to_content();

-- Backfill existing rows.
insert into public.content_items (
  workspace_id, created_by, title, status, tags, metadata,
  legacy_saved_thread_id, created_at, updated_at
)
select
  st.workspace_id,
  st.user_id,
  st.topic,
  'draft',
  coalesce(st.tags, '[]'::jsonb),
  jsonb_build_object(
    'format', st.format,
    'style', st.style,
    'tone', st.tone,
    'language', st.language,
    'targetAudience', st.target_audience,
    'contentGoal', st.content_goal,
    'settings', st.settings,
    'affiliate', st.affiliate
  ),
  st.id,
  st.created_at,
  st.updated_at
from public.saved_threads st
where st.workspace_id is not null
on conflict (legacy_saved_thread_id) where legacy_saved_thread_id is not null
do nothing;

insert into public.content_segments (content_item_id, position, text)
select
  ci.id,
  (t.ord - 1)::integer,
  t.value ->> 'content'
from public.saved_threads st
join public.content_items ci on ci.legacy_saved_thread_id = st.id
cross join lateral jsonb_array_elements(coalesce(st.tweets, '[]'::jsonb))
  with ordinality as t(value, ord)
where coalesce(t.value ->> 'content', '') <> ''
on conflict (content_item_id, position) do nothing;

-- =============================================================================
-- BACKFILL: scheduled_posts -> post_targets
-- =============================================================================

do $$
declare
  sp            record;
  v_content_id  uuid;
  v_social_id   uuid;
  v_target_id   uuid;
  v_status      text;
  v_pos         integer;
  v_seg         jsonb;
begin
  for sp in
    select * from public.scheduled_posts
    where workspace_id is not null
  loop
    if exists (
      select 1 from public.post_targets where legacy_scheduled_post_id = sp.id
    ) then
      continue;
    end if;

    select sa.id into v_social_id
    from public.social_accounts sa
    join public.threads_accounts ta
      on ta.threads_user_id = sa.provider_account_id
     and ta.workspace_id = sa.workspace_id
    where ta.id = sp.threads_account_id
      and sa.provider = 'threads'
    limit 1;

    if v_social_id is null then
      continue;
    end if;

    v_content_id := null;
    if sp.saved_thread_id is not null then
      select id into v_content_id
      from public.content_items
      where legacy_saved_thread_id = sp.saved_thread_id;
    end if;

    if v_content_id is null then
      insert into public.content_items (
        workspace_id, created_by, title, status, metadata
      )
      values (
        sp.workspace_id,
        sp.user_id,
        'Migrated post',
        'draft',
        jsonb_build_object('migrated_from', 'scheduled_posts')
      )
      returning id into v_content_id;

      v_pos := 0;
      for v_seg in
        select value from jsonb_array_elements(coalesce(sp.reply_chain, '[]'::jsonb))
      loop
        if coalesce(v_seg #>> '{}', '') <> '' then
          insert into public.content_segments (content_item_id, position, text)
          values (v_content_id, v_pos, v_seg #>> '{}');
        end if;
        v_pos := v_pos + 1;
      end loop;
    end if;

    v_status := case sp.status::text
      when 'scheduled' then 'scheduled'
      when 'publishing' then 'scheduled'
      when 'published' then 'published'
      when 'partial_published' then 'partial'
      when 'failed' then 'failed'
      else 'draft'
    end;

    insert into public.post_targets (
      workspace_id, content_item_id, social_account_id, scheduled_for,
      timezone, status, idempotency_key, provider_post_id, attempts,
      error_message, published_at, legacy_scheduled_post_id, created_at, updated_at
    )
    values (
      sp.workspace_id,
      v_content_id,
      v_social_id,
      coalesce(sp.scheduled_for, now()),
      'Asia/Jakarta',
      v_status,
      'legacy-' || sp.id::text,
      sp.threads_post_id,
      coalesce(sp.attempts, 0),
      sp.error_message,
      sp.published_at,
      sp.id,
      sp.created_at,
      sp.updated_at
    )
    returning id into v_target_id;

    -- Keep the ordered text on the target so a migrated row publishes exactly
    -- as it would have from the legacy table.
    update public.post_targets
    set content_override = jsonb_build_object(
      'segments',
      coalesce(
        (select jsonb_agg(s.text order by s.position)
         from public.content_segments s
         where s.content_item_id = v_content_id),
        '[]'::jsonb
      )
    )
    where id = v_target_id;
  end loop;
end;
$$;

-- =============================================================================
-- CONTENT STATUS SUMMARY
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

drop trigger if exists refresh_content_status_trigger on public.post_targets;
create trigger refresh_content_status_trigger
  after insert or update of status or delete on public.post_targets
  for each row execute procedure public.refresh_content_status();

-- Backfilled targets were inserted before the trigger existed.
update public.content_items ci
set status = summary.status
from (
  select
    content_item_id,
    case
      when count(*) filter (where status in ('scheduled', 'publishing')) > 0 then 'scheduled'
      when count(*) filter (where status = 'partial') > 0 then 'partial'
      when count(*) filter (where status = 'failed') = count(*) then 'failed'
      when count(*) filter (where status = 'published') = count(*) then 'published'
      else 'draft'
    end as status
  from public.post_targets
  group by content_item_id
) summary
where ci.id = summary.content_item_id;

-- =============================================================================
-- QUEUE FUNCTIONS (service_role only)
-- =============================================================================

create or replace function public.claim_post_targets(p_limit integer default 5)
returns table (
  id               uuid,
  workspace_id     uuid,
  content_item_id  uuid,
  social_account_id uuid,
  provider         text,
  scheduled_for    timestamptz,
  attempts         integer,
  checkpoint       integer,
  provider_state   jsonb,
  content_override jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with due as (
    select pt.id
    from public.post_targets pt
    where pt.status = 'scheduled'
      and pt.scheduled_for <= now()
      and (pt.next_attempt_at is null or pt.next_attempt_at <= now())
    order by pt.scheduled_for
    limit greatest(p_limit, 1)
    for update skip locked
  ),
  claimed as (
    update public.post_targets pt
    set status = 'publishing',
        locked_at = now(),
        attempts = pt.attempts + 1,
        updated_at = now()
    from due
    where pt.id = due.id
    returning pt.*
  )
  select
    c.id,
    c.workspace_id,
    c.content_item_id,
    c.social_account_id,
    sa.provider,
    c.scheduled_for,
    c.attempts,
    c.checkpoint,
    c.provider_state,
    c.content_override
  from claimed c
  join public.social_accounts sa on sa.id = c.social_account_id;
end;
$$;

/** Claims one specific target, used by "publish now". */
create or replace function public.claim_post_target(p_id uuid)
returns table (
  id               uuid,
  workspace_id     uuid,
  content_item_id  uuid,
  social_account_id uuid,
  provider         text,
  scheduled_for    timestamptz,
  attempts         integer,
  checkpoint       integer,
  provider_state   jsonb,
  content_override jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with claimed as (
    update public.post_targets pt
    set status = 'publishing',
        locked_at = now(),
        attempts = pt.attempts + 1,
        updated_at = now()
    where pt.id = p_id
      and pt.status = 'scheduled'
      and pt.scheduled_for <= now()
    returning pt.*
  )
  select
    c.id,
    c.workspace_id,
    c.content_item_id,
    c.social_account_id,
    sa.provider,
    c.scheduled_for,
    c.attempts,
    c.checkpoint,
    c.provider_state,
    c.content_override
  from claimed c
  join public.social_accounts sa on sa.id = c.social_account_id;
end;
$$;

create or replace function public.complete_post_target(p_id uuid, p_result jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.post_targets
  set status = case p_result ->> 'status'
        when 'published' then 'published'
        when 'partial' then 'partial'
        else 'failed'
      end,
      provider_post_id = coalesce(p_result ->> 'providerPostId', provider_post_id),
      provider_url = coalesce(p_result ->> 'providerUrl', provider_url),
      provider_state = coalesce(p_result -> 'providerState', provider_state),
      checkpoint = coalesce((p_result ->> 'publishedCount')::integer, checkpoint),
      error_code = p_result ->> 'errorCode',
      error_message = p_result ->> 'errorMessage',
      published_at = case
        when p_result ->> 'status' = 'published' then now()
        else published_at
      end,
      locked_at = null,
      next_attempt_at = null,
      updated_at = now()
  where id = p_id;
end;
$$;

create or replace function public.fail_post_target(
  p_id uuid,
  p_code text,
  p_message text,
  p_retry_at timestamptz default null,
  p_checkpoint integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.post_targets
  set status = case when p_retry_at is null then 'failed' else 'scheduled' end,
      next_attempt_at = p_retry_at,
      checkpoint = coalesce(p_checkpoint, checkpoint),
      error_code = p_code,
      error_message = p_message,
      locked_at = null,
      updated_at = now()
  where id = p_id;
end;
$$;

revoke all on function public.claim_post_targets(integer) from public;
revoke all on function public.claim_post_target(uuid) from public;
revoke all on function public.complete_post_target(uuid, jsonb) from public;
revoke all on function public.fail_post_target(uuid, text, text, timestamptz, integer) from public;

grant execute on function public.claim_post_targets(integer) to service_role;
grant execute on function public.claim_post_target(uuid) to service_role;
grant execute on function public.complete_post_target(uuid, jsonb) to service_role;
grant execute on function public.fail_post_target(uuid, text, text, timestamptz, integer) to service_role;
revoke all on function public.ensure_personal_workspace() from public;
grant execute on function public.ensure_personal_workspace() to authenticated;

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.social_accounts enable row level security;
alter table public.content_items enable row level security;
alter table public.content_segments enable row level security;
alter table public.media_assets enable row level security;
alter table public.post_targets enable row level security;
alter table public.post_target_media enable row level security;
alter table public.publish_attempts enable row level security;

-- workspaces
drop policy if exists "Members can read workspaces" on public.workspaces;
create policy "Members can read workspaces"
  on public.workspaces for select
  using (public.is_workspace_member(id));

drop policy if exists "Admins can update workspaces" on public.workspaces;
create policy "Admins can update workspaces"
  on public.workspaces for update
  using (public.is_workspace_member(id, 'admin'));

-- workspace_members
drop policy if exists "Members can read workspace members" on public.workspace_members;
create policy "Members can read workspace members"
  on public.workspace_members for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists "Admins can manage workspace members" on public.workspace_members;
create policy "Admins can manage workspace members"
  on public.workspace_members for all
  using (public.is_workspace_member(workspace_id, 'admin'))
  with check (public.is_workspace_member(workspace_id, 'admin'));

-- social_accounts: tokens never leave the server, so writes are admin-only.
drop policy if exists "Members can read social accounts" on public.social_accounts;
create policy "Members can read social accounts"
  on public.social_accounts for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists "Admins can manage social accounts" on public.social_accounts;
create policy "Admins can manage social accounts"
  on public.social_accounts for all
  using (public.is_workspace_member(workspace_id, 'admin'))
  with check (public.is_workspace_member(workspace_id, 'admin'));

-- content_items / content_segments
drop policy if exists "Members can read content items" on public.content_items;
create policy "Members can read content items"
  on public.content_items for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists "Editors can write content items" on public.content_items;
create policy "Editors can write content items"
  on public.content_items for all
  using (public.is_workspace_member(workspace_id, 'editor'))
  with check (public.is_workspace_member(workspace_id, 'editor'));

drop policy if exists "Members can read content segments" on public.content_segments;
create policy "Members can read content segments"
  on public.content_segments for select
  using (exists (
    select 1 from public.content_items ci
    where ci.id = content_item_id
      and public.is_workspace_member(ci.workspace_id)
  ));

drop policy if exists "Editors can write content segments" on public.content_segments;
create policy "Editors can write content segments"
  on public.content_segments for all
  using (exists (
    select 1 from public.content_items ci
    where ci.id = content_item_id
      and public.is_workspace_member(ci.workspace_id, 'editor')
  ))
  with check (exists (
    select 1 from public.content_items ci
    where ci.id = content_item_id
      and public.is_workspace_member(ci.workspace_id, 'editor')
  ));

-- media_assets
drop policy if exists "Members can read media" on public.media_assets;
create policy "Members can read media"
  on public.media_assets for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists "Editors can write media" on public.media_assets;
create policy "Editors can write media"
  on public.media_assets for all
  using (public.is_workspace_member(workspace_id, 'editor'))
  with check (public.is_workspace_member(workspace_id, 'editor'));

-- post_targets
drop policy if exists "Members can read targets" on public.post_targets;
create policy "Members can read targets"
  on public.post_targets for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists "Editors can write targets" on public.post_targets;
create policy "Editors can write targets"
  on public.post_targets for all
  using (public.is_workspace_member(workspace_id, 'editor'))
  with check (public.is_workspace_member(workspace_id, 'editor'));

-- post_target_media
drop policy if exists "Members can read target media" on public.post_target_media;
create policy "Members can read target media"
  on public.post_target_media for select
  using (exists (
    select 1 from public.post_targets pt
    where pt.id = post_target_id
      and public.is_workspace_member(pt.workspace_id)
  ));

drop policy if exists "Editors can write target media" on public.post_target_media;
create policy "Editors can write target media"
  on public.post_target_media for all
  using (exists (
    select 1 from public.post_targets pt
    where pt.id = post_target_id
      and public.is_workspace_member(pt.workspace_id, 'editor')
  ))
  with check (exists (
    select 1 from public.post_targets pt
    where pt.id = post_target_id
      and public.is_workspace_member(pt.workspace_id, 'editor')
  ));

-- publish_attempts: read-only for members, written by the worker.
drop policy if exists "Members can read publish attempts" on public.publish_attempts;
create policy "Members can read publish attempts"
  on public.publish_attempts for select
  using (exists (
    select 1 from public.post_targets pt
    where pt.id = post_target_id
      and public.is_workspace_member(pt.workspace_id)
  ));

-- =============================================================================
-- STORAGE
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'workspace-media',
  'workspace-media',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "Workspace media read" on storage.objects;
create policy "Workspace media read"
  on storage.objects for select
  using (
    bucket_id = 'workspace-media'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Workspace media insert" on storage.objects;
create policy "Workspace media insert"
  on storage.objects for insert
  with check (
    bucket_id = 'workspace-media'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid, 'editor')
  );

drop policy if exists "Workspace media delete" on storage.objects;
create policy "Workspace media delete"
  on storage.objects for delete
  using (
    bucket_id = 'workspace-media'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid, 'editor')
  );

-- =============================================================================
-- updated_at triggers
-- =============================================================================

drop trigger if exists set_workspaces_updated_at on public.workspaces;
create trigger set_workspaces_updated_at
  before update on public.workspaces
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_social_accounts_updated_at on public.social_accounts;
create trigger set_social_accounts_updated_at
  before update on public.social_accounts
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_content_items_updated_at on public.content_items;
create trigger set_content_items_updated_at
  before update on public.content_items
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_post_targets_updated_at on public.post_targets;
create trigger set_post_targets_updated_at
  before update on public.post_targets
  for each row execute procedure public.set_updated_at();

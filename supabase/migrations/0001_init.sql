-- =============================================================================
-- Migration: 0001_init
-- Tables: profiles, threads_accounts, scheduled_posts
--
-- Every statement is idempotent so this file can be pushed repeatedly with
-- `npm run db:push` without "already exists" errors. Policies are dropped and
-- recreated; the enum is created only when missing.
-- =============================================================================

-- Enable pgcrypto for gen_random_uuid() on older Postgres versions
create extension if not exists pgcrypto;

-- =============================================================================
-- TABLE: profiles
-- Auto-populated via trigger when a new auth.users row is created.
-- =============================================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger: auto-insert profile from Google metadata on sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================================================
-- TABLE: threads_accounts
-- Stores connected Threads accounts per user (encrypted access token).
-- =============================================================================
create table if not exists public.threads_accounts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  threads_user_id   text not null,
  username          text not null,
  access_token      text not null,
  token_expires_at  timestamptz,
  is_active         boolean not null default true,
  connected_at      timestamptz not null default now(),
  unique (user_id, threads_user_id)
);

alter table public.threads_accounts enable row level security;

drop policy if exists "Users can read own threads accounts" on public.threads_accounts;
create policy "Users can read own threads accounts"
  on public.threads_accounts for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own threads accounts" on public.threads_accounts;
create policy "Users can insert own threads accounts"
  on public.threads_accounts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own threads accounts" on public.threads_accounts;
create policy "Users can update own threads accounts"
  on public.threads_accounts for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own threads accounts" on public.threads_accounts;
create policy "Users can delete own threads accounts"
  on public.threads_accounts for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- TABLE: scheduled_posts
-- Stores post queue (manual + scheduled). reply_chain holds the ordered tweets.
-- =============================================================================
do $$
begin
  if not exists (
    select 1 from pg_type
    where typname = 'post_status' and typnamespace = 'public'::regnamespace
  ) then
    create type public.post_status as enum (
      'draft',
      'scheduled',
      'publishing',
      'published',
      'partial_published',
      'failed'
    );
  end if;
end;
$$;

create table if not exists public.scheduled_posts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  threads_account_id  uuid references public.threads_accounts (id) on delete set null,
  reply_chain         jsonb not null default '[]',
  scheduled_for       timestamptz,
  status              public.post_status not null default 'draft',
  threads_post_id     text,
  error_message       text,
  published_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.scheduled_posts enable row level security;

drop policy if exists "Users can read own scheduled posts" on public.scheduled_posts;
create policy "Users can read own scheduled posts"
  on public.scheduled_posts for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own scheduled posts" on public.scheduled_posts;
create policy "Users can insert own scheduled posts"
  on public.scheduled_posts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own scheduled posts" on public.scheduled_posts;
create policy "Users can update own scheduled posts"
  on public.scheduled_posts for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own scheduled posts" on public.scheduled_posts;
create policy "Users can delete own scheduled posts"
  on public.scheduled_posts for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_scheduled_posts_updated_at on public.scheduled_posts;
create trigger set_scheduled_posts_updated_at
  before update on public.scheduled_posts
  for each row execute procedure public.set_updated_at();

-- Index for cron job: fetch posts due for publishing
create index if not exists idx_scheduled_posts_due
  on public.scheduled_posts (status, scheduled_for)
  where status = 'scheduled';

-- =============================================================================
-- Migration: 0002_saved_threads
-- Tables: saved_threads (user-owned library), thread_publishes (per-account log)
--
-- Idempotent: safe to push repeatedly with `npm run db:push`.
-- =============================================================================

-- =============================================================================
-- TABLE: saved_threads
-- The user's saved library. Owned by the user, independent of any Threads
-- account: the same saved thread can be published to more than one account.
-- =============================================================================
create table if not exists public.saved_threads (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  topic            text not null default '',
  format           text not null default 'thread',
  style            text not null default 'casual',
  tone             text not null default 'friendly',
  language         text not null default 'id',
  target_audience  text not null default '',
  content_goal     text not null default 'engagement',
  tweets           jsonb not null default '[]',
  settings         jsonb not null default '{}',
  affiliate        jsonb,
  total_tweets     integer not null default 0,
  total_chars      integer not null default 0,
  is_favorite      boolean not null default false,
  tags             jsonb not null default '[]',
  notes            text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.saved_threads enable row level security;

drop policy if exists "Users can read own saved threads" on public.saved_threads;
create policy "Users can read own saved threads"
  on public.saved_threads for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own saved threads" on public.saved_threads;
create policy "Users can insert own saved threads"
  on public.saved_threads for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own saved threads" on public.saved_threads;
create policy "Users can update own saved threads"
  on public.saved_threads for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own saved threads" on public.saved_threads;
create policy "Users can delete own saved threads"
  on public.saved_threads for delete
  using (auth.uid() = user_id);

drop trigger if exists set_saved_threads_updated_at on public.saved_threads;
create trigger set_saved_threads_updated_at
  before update on public.saved_threads
  for each row execute procedure public.set_updated_at();

create index if not exists idx_saved_threads_user_created
  on public.saved_threads (user_id, created_at desc);

-- =============================================================================
-- TABLE: thread_publishes
-- One row per publish attempt of a saved thread to a Threads account. This is
-- the source of truth for the per-account "already posted" badge.
-- =============================================================================
create table if not exists public.thread_publishes (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  saved_thread_id     uuid references public.saved_threads (id) on delete set null,
  threads_account_id  uuid references public.threads_accounts (id) on delete set null,
  status              public.post_status not null default 'published',
  threads_post_id     text,
  reply_chain         jsonb not null default '[]',
  error_message       text,
  published_at        timestamptz not null default now()
);

alter table public.thread_publishes enable row level security;

drop policy if exists "Users can read own publishes" on public.thread_publishes;
create policy "Users can read own publishes"
  on public.thread_publishes for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own publishes" on public.thread_publishes;
create policy "Users can insert own publishes"
  on public.thread_publishes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own publishes" on public.thread_publishes;
create policy "Users can update own publishes"
  on public.thread_publishes for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own publishes" on public.thread_publishes;
create policy "Users can delete own publishes"
  on public.thread_publishes for delete
  using (auth.uid() = user_id);

create index if not exists idx_thread_publishes_lookup
  on public.thread_publishes (user_id, threads_account_id, saved_thread_id);

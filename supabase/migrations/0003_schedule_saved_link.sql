-- =============================================================================
-- Migration: 0003_schedule_saved_link
-- Link scheduled posts to the saved thread they came from, and add columns
-- needed by the cron publisher (attempts counter for auto-retry).
--
-- Idempotent: safe to push repeatedly with `npm run db:push`.
-- =============================================================================

alter table public.scheduled_posts
  add column if not exists saved_thread_id uuid
    references public.saved_threads (id) on delete set null;

alter table public.scheduled_posts
  add column if not exists attempts integer not null default 0;

-- Cron lookup: due, still-pending posts. The index from 0001 covers
-- (status, scheduled_for) where status = 'scheduled'; this one adds ordering
-- by time so the batch takes the oldest first.
create index if not exists idx_scheduled_posts_due_ordered
  on public.scheduled_posts (scheduled_for)
  where status = 'scheduled';

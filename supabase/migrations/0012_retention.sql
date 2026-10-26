-- =============================================================================
-- Migration: 0012_retention
-- Deletes analytics older than the plan's retention window and notifications
-- older than 90 days. Called from the cron worker.
--
-- Idempotent: safe to push repeatedly with `npm run db:push`.
-- =============================================================================

create or replace function public.prune_expired_data()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer := 0;
  v_count   integer := 0;
begin
  -- Analytics retention follows the workspace plan (see lib/billing/credits.ts).
  delete from public.analytics_snapshots a
  using public.workspaces w
  where a.workspace_id = w.id
    and a.captured_at < now() - (
      case w.plan
        when 'free' then interval '7 days'
        when 'starter' then interval '30 days'
        when 'creator' then interval '90 days'
        when 'pro' then interval '180 days'
        else interval '7 days'
      end
    );

  get diagnostics v_count = row_count;
  v_deleted := v_deleted + v_count;

  delete from public.notifications
  where created_at < now() - interval '90 days';

  get diagnostics v_count = row_count;
  v_deleted := v_deleted + v_count;

  return v_deleted;
end;
$$;

revoke all on function public.prune_expired_data() from public, authenticated, anon;
grant execute on function public.prune_expired_data() to service_role;

-- =============================================================================
-- Migration: 0014_publish_integrity
-- 1. Refund the scheduled-post slot when a target fails before any post went
--    out, so a failed publish does not silently cost a slot.
-- 2. Restrict the media bucket to the formats Threads accepts.
--
-- Idempotent: safe to push repeatedly with `npm run db:push`.
-- =============================================================================

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
declare
  v_workspace  uuid;
  v_checkpoint integer;
begin
  update public.post_targets
  set status = case when p_retry_at is null then 'failed' else 'scheduled' end,
      next_attempt_at = p_retry_at,
      checkpoint = coalesce(p_checkpoint, checkpoint),
      error_code = p_code,
      error_message = p_message,
      locked_at = null,
      updated_at = now()
  where id = p_id
    and status = 'publishing'
  returning workspace_id, checkpoint into v_workspace, v_checkpoint;

  -- Nothing was published and no retry is planned: give the slot back.
  -- A partial publish keeps its slot because the platform already has posts.
  if v_workspace is not null
     and p_retry_at is null
     and coalesce(v_checkpoint, 0) = 0 then
    update public.usage_counters
    set value = greatest(0, value - 1),
        updated_at = now()
    where workspace_id = v_workspace
      and period = to_char(now() at time zone 'utc', 'YYYY-MM')
      and metric = 'scheduled_posts';
  end if;
end;
$$;

revoke all on function public.fail_post_target(uuid, text, text, timestamptz, integer)
  from public, authenticated, anon;
grant execute on function public.fail_post_target(uuid, text, text, timestamptz, integer)
  to service_role;

-- =============================================================================
-- Media bucket: JPEG and PNG only
-- =============================================================================

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png']
where id = 'workspace-media';

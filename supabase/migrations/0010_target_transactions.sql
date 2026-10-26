-- =============================================================================
-- Migration: 0010_target_transactions
-- Atomic target creation (quota + target + media), idempotent retries, and
-- status guards so a stale worker cannot overwrite a finished target.
--
-- Idempotent: safe to push repeatedly with `npm run db:push`.
-- =============================================================================

create or replace function public.create_post_target(
  p_workspace uuid,
  p_content_item uuid,
  p_social_account uuid,
  p_scheduled_for timestamptz,
  p_timezone text,
  p_idempotency_key text,
  p_segments jsonb,
  p_media uuid default null,
  p_consume boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target uuid;
  v_allowed bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'create_post_target is service-role only';
  end if;

  if p_consume then
    v_allowed := public.consume_usage(
      p_workspace,
      to_char(now() at time zone 'utc', 'YYYY-MM'),
      'scheduled_posts',
      1
    );
    if v_allowed is null then
      raise exception 'scheduled_posts_exhausted' using errcode = 'P0001';
    end if;
  end if;

  begin
    insert into public.post_targets (
      workspace_id, content_item_id, social_account_id, scheduled_for,
      timezone, status, content_override, idempotency_key
    )
    values (
      p_workspace, p_content_item, p_social_account, p_scheduled_for,
      p_timezone, 'scheduled', jsonb_build_object('segments', p_segments),
      p_idempotency_key
    )
    returning id into v_target;
  exception when unique_violation then
    select id into v_target
    from public.post_targets
    where idempotency_key = p_idempotency_key
      and workspace_id = p_workspace;

    if v_target is null then
      raise;
    end if;

    -- A retried request already consumed its slot the first time.
    return v_target;
  end;

  if p_media is not null then
    insert into public.post_target_media (post_target_id, media_asset_id, position)
    values (v_target, p_media, 0)
    on conflict do nothing;
  end if;

  return v_target;
end;
$$;

revoke all on function public.create_post_target(
  uuid, uuid, uuid, timestamptz, text, text, jsonb, uuid, boolean
) from public, authenticated, anon;
grant execute on function public.create_post_target(
  uuid, uuid, uuid, timestamptz, text, text, jsonb, uuid, boolean
) to service_role;

-- =============================================================================
-- STATUS GUARDS
-- Only a worker holding the target (status = 'publishing') can finish it.
-- A late duplicate call becomes a no-op instead of overwriting a published row.
-- =============================================================================

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
  where id = p_id
    and status = 'publishing';
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
  where id = p_id
    and status = 'publishing';
end;
$$;

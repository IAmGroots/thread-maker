-- =============================================================================
-- Migration: 0005_sync_scopes
-- Fixes the legacy threads_accounts -> social_accounts mirror so that
-- reconnecting an account updates the stored `scopes` array (previously it was
-- only written on first insert, leaving a stale ['threads_basic',
-- 'threads_content_publish'] after scopes were widened for replies/insights).
--
-- Idempotent: safe to push repeatedly with `npm run db:push`.
-- =============================================================================

create or replace function public.sync_threads_account_to_social()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace uuid;
  v_scopes    text[];
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

  -- The full permission set this app requests for Threads. Kept in sync with
  -- THREADS_SCOPES in lib/threads/oauth.ts.
  v_scopes := array[
    'threads_basic',
    'threads_content_publish',
    'threads_manage_replies',
    'threads_read_replies',
    'threads_manage_insights'
  ]::text[];

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
    v_scopes,
    case when new.is_active then 'active' else 'revoked' end,
    new.user_id,
    new.connected_at
  )
  on conflict (workspace_id, provider, provider_account_id) do update
  set username = excluded.username,
      access_token_enc = excluded.access_token_enc,
      token_expires_at = excluded.token_expires_at,
      scopes = excluded.scopes,
      status = excluded.status,
      updated_at = now();

  return new;
end;
$$;

-- Backfill scopes on existing active Threads accounts so already-connected
-- users can see the granted scopes in metadata (tokens still need a reconnect
-- to actually carry the new permissions).
update public.social_accounts
set scopes = array[
    'threads_basic',
    'threads_content_publish',
    'threads_manage_replies',
    'threads_read_replies',
    'threads_manage_insights'
  ]::text[],
    updated_at = now()
where provider = 'threads'
  and status = 'active'
  and not (scopes @> array['threads_manage_replies']::text[]);

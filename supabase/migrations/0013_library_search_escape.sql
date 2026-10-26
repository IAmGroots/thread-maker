-- =============================================================================
-- Migration: 0013_library_search_escape
-- The caller now sends a pre-escaped LIKE pattern, so wildcards typed by the
-- user match literally (`100%` no longer matches every row).
--
-- Idempotent: safe to push repeatedly with `npm run db:push`.
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
        or coalesce(p_query, '') = '%%'
        or st.topic ilike p_query
        or st.style ilike p_query
        or st.tone ilike p_query
        or st.notes ilike p_query
        or st.tweets::text ilike p_query
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

grant execute on function public.search_saved_threads(uuid, text, integer, integer)
  to authenticated;

-- Trigram index for substring search. Best effort: on Supabase the extension
-- may already live in the `extensions` schema, so a failure here must not block
-- the migration.
do $$
begin
  create extension if not exists pg_trgm;
  execute 'create index if not exists idx_saved_threads_topic_trgm
    on public.saved_threads using gin (topic gin_trgm_ops)';
exception
  when others then
    raise warning 'skipping trigram index on saved_threads.topic: %', sqlerrm;
end;
$$;

-- =============================================================================
-- Migration: 0015_notification_params
-- Notifications store structured parameters so the UI can render them in the
-- reader's language. The stored title/body stay as an English fallback for
-- older rows and for any client that does not know the type yet.
--
-- Idempotent: safe to push repeatedly with `npm run db:push`.
-- =============================================================================

alter table public.notifications
  add column if not exists params jsonb not null default '{}'::jsonb;

-- Expiry reminders now emit parameters instead of a pre-rendered sentence.
create or replace function public.create_expiry_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub    record;
  v_count  integer := 0;
  v_urgent boolean;
  v_date   text;
  v_title  text;
  v_body   text;
begin
  for v_sub in
    select s.workspace_id, s.plan, s.current_period_end,
           s.reminder_7_sent_at, s.reminder_1_sent_at
    from public.subscriptions s
    where s.status in ('active', 'trialing')
      and s.current_period_end > now()
      and s.current_period_end <= now() + interval '7 days'
  loop
    v_urgent := v_sub.current_period_end <= now() + interval '1 day';
    v_date := to_char(v_sub.current_period_end, 'YYYY-MM-DD"T"HH24:MI:SSOF');
    v_title := null;

    if v_urgent and v_sub.reminder_1_sent_at is null then
      v_title := 'Your plan ends today or tomorrow';
      v_body := format(
        'Your %s plan ends on %s. Renew to keep your current limits.',
        v_sub.plan,
        to_char(v_sub.current_period_end, 'DD Mon YYYY HH24:MI')
      );
    elsif not v_urgent and v_sub.reminder_7_sent_at is null then
      v_title := 'Your plan ends this week';
      v_body := format(
        'Your %s plan ends on %s. Renew any time before then; the new period starts where the old one ends.',
        v_sub.plan,
        to_char(v_sub.current_period_end, 'DD Mon YYYY')
      );
    end if;

    if v_title is null then
      continue;
    end if;

    insert into public.notifications (
      workspace_id, user_id, type, title, body, entity_type, params
    )
    select
      v_sub.workspace_id,
      m.user_id,
      'system',
      v_title,
      v_body,
      'subscription',
      jsonb_build_object(
        'kind', 'plan_ending',
        'plan', v_sub.plan,
        'date', v_date,
        'urgent', v_urgent
      )
    from public.workspace_members m
    where m.workspace_id = v_sub.workspace_id
      and m.role in ('owner', 'admin');

    update public.subscriptions
    set reminder_7_sent_at = case
          when v_urgent then coalesce(reminder_7_sent_at, now())
          else now()
        end,
        reminder_1_sent_at = case
          when v_urgent then now()
          else reminder_1_sent_at
        end,
        updated_at = now()
    where workspace_id = v_sub.workspace_id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.create_expiry_reminders() from public;
grant execute on function public.create_expiry_reminders() to service_role;

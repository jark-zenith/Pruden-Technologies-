-- Persist an Ivy notification for every public website inbox submission.
-- Website submissions remain in website_inbox; this is a linked notification queue, not a duplicate customer record.
alter table public.website_inbox
  drop constraint if exists website_inbox_submission_type_check;
alter table public.website_inbox
  add constraint website_inbox_submission_type_check
  check (submission_type = any (array[
    'application','booking','contact','feedback','quote_request','support','other'
  ]::text[]));

create table if not exists public.ivy_notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null default 'website_submission'
    check (notification_type in ('website_submission')),
  source_table text not null default 'website_inbox',
  source_id uuid not null,
  title text not null,
  body text not null default '',
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  status text not null default 'new' check (status in ('new','seen','acknowledged','dismissed')),
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  constraint ivy_notifications_source_unique unique (source_table, source_id, notification_type)
);
create index if not exists ivy_notifications_owner_status_created_idx
  on public.ivy_notifications (owner_id, status, created_at desc);
alter table public.ivy_notifications enable row level security;
drop policy if exists "Owner can read Ivy notifications" on public.ivy_notifications;
create policy "Owner can read Ivy notifications" on public.ivy_notifications
  for select to authenticated using (auth.uid() = owner_id);
drop policy if exists "Owner can update Ivy notification status" on public.ivy_notifications;
create policy "Owner can update Ivy notification status" on public.ivy_notifications
  for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
grant select, update on public.ivy_notifications to authenticated;

create or replace function public.notify_ivy_of_website_submission()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_kind text;
  v_title text;
  v_body text;
begin
  v_kind := case new.submission_type
    when 'booking' then 'booking'
    when 'feedback' then 'feedback'
    when 'quote_request' then 'project enquiry'
    when 'application' then 'application'
    when 'support' then 'support request'
    else 'website message'
  end;
  v_title := 'New website ' || v_kind || ' — ' || coalesce(nullif(new.source_site, ''), 'Unknown site');
  v_body := concat_ws(E'\n',
    'From: ' || coalesce(nullif(new.name, ''), 'Website visitor'),
    case when nullif(new.email, '') is not null then 'Email: ' || new.email end,
    case when nullif(new.phone, '') is not null then 'Phone: ' || new.phone end,
    case when nullif(new.subject, '') is not null then 'Subject: ' || new.subject end,
    case when nullif(new.message, '') is not null then 'Message: ' || left(new.message, 4000) end
  );
  insert into public.ivy_notifications (
    owner_id, notification_type, source_table, source_id, title, body, payload
  ) values (
    new.owner_id, 'website_submission', 'website_inbox', new.id, v_title, v_body,
    jsonb_build_object(
      'inbox_id', new.id, 'submission_type', new.submission_type,
      'source_site', new.source_site, 'source_url', new.source_url,
      'name', new.name, 'email', new.email, 'phone', new.phone,
      'subject', new.subject, 'form_payload', new.payload
    )
  ) on conflict (source_table, source_id, notification_type) do nothing;
  return new;
end;
$$;
drop trigger if exists website_inbox_notify_ivy on public.website_inbox;
create trigger website_inbox_notify_ivy after insert on public.website_inbox
  for each row execute function public.notify_ivy_of_website_submission();
comment on table public.ivy_notifications is
  'Owner-scoped notification queue. Website inbox submissions create an Ivy-visible notification through a database trigger.';

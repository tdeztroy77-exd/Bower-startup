-- ============================================================
-- 25-sms-reminders.sql
--
-- SMS reminders for tenants without email.
--
-- Sending is provider-backed (Africa's Talking). When the provider is not
-- configured, messages are recorded as 'skipped' — never as 'sent'. The log is
-- the record of what actually happened.
--
-- Idempotent. Safe to re-run.
-- ============================================================

create table if not exists public.sms_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  days_before integer not null default 3 check (days_before between 0 and 14),
  sender_id text,
  updated_at timestamptz not null default now()
);

alter table public.sms_settings enable row level security;

drop policy if exists "sms_settings_select_own" on public.sms_settings;
create policy "sms_settings_select_own" on public.sms_settings
  for select using (auth.uid() = user_id);

revoke insert, update, delete on public.sms_settings from anon, authenticated;

create table if not exists public.sms_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete set null,
  phone text not null,
  body text not null,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'failed', 'skipped')),
  provider text,
  provider_ref text,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists sms_messages_user_idx
  on public.sms_messages (user_id, created_at desc);
create index if not exists sms_messages_tenant_idx
  on public.sms_messages (tenant_id, created_at desc);

alter table public.sms_messages enable row level security;

drop policy if exists "sms_messages_select_own" on public.sms_messages;
create policy "sms_messages_select_own" on public.sms_messages
  for select using (auth.uid() = user_id);

revoke insert, update, delete on public.sms_messages from anon, authenticated;

comment on table public.sms_messages is
  'Outbound tenant SMS log. Only sent/failed/skipped statuses; skipped means no provider was configured.';

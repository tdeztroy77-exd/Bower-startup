-- ============================================================
-- 24-late-fees.sql
--
-- Late fee policy and applied charges.
--
-- Off by default. A fee is applied once per invoice, after a grace period,
-- and is capped. The policy lives with the landlord, not the platform, so a
-- portfolio that does not charge fees never has one applied.
--
-- Idempotent. Safe to re-run.
-- ============================================================

create table if not exists public.late_fee_policies (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  grace_days integer not null default 5 check (grace_days between 0 and 30),
  fee_type text not null default 'flat' check (fee_type in ('flat', 'percent')),
  amount numeric(12,2) not null default 500 check (amount >= 0),
  percent numeric(6,2) not null default 5 check (percent >= 0 and percent <= 50),
  cap numeric(12,2) not null default 5000 check (cap >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.late_fee_policies enable row level security;

drop policy if exists "late_fee_policies_select_own" on public.late_fee_policies;
create policy "late_fee_policies_select_own" on public.late_fee_policies
  for select using (auth.uid() = user_id);

revoke insert, update, delete on public.late_fee_policies from anon, authenticated;

create table if not exists public.late_fee_charges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  payment_id uuid not null references public.rent_payments(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  waived boolean not null default false,
  applied_at timestamptz not null default now(),
  constraint late_fee_charges_payment_unique unique (payment_id)
);

create index if not exists late_fee_charges_user_idx
  on public.late_fee_charges (user_id, applied_at desc);

alter table public.late_fee_charges enable row level security;

drop policy if exists "late_fee_charges_select_own" on public.late_fee_charges;
create policy "late_fee_charges_select_own" on public.late_fee_charges
  for select using (auth.uid() = user_id);

revoke insert, update, delete on public.late_fee_charges from anon, authenticated;

comment on table public.late_fee_charges is
  'One late fee per invoice. Written by the late-fee job with the service role.';

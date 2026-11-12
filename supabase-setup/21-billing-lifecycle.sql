-- ============================================================
-- 21-billing-lifecycle.sql
--
-- Makes the subscription lifecycle real:
--   * a paid period that ends becomes past_due (grace), then expired
--   * a successful payment extends the period idempotently
--   * renewal prompts can be scheduled for M-Pesa subscribers
--   * Stripe subscription ids are stored so renewals can be reconciled
--   * users can no longer write their own subscription row (RLS bypass fix)
--
-- Idempotent. Safe to re-run.
-- ============================================================

-- 1) Columns ---------------------------------------------------------------
alter table public.subscriptions add column if not exists auto_renew boolean not null default true;
alter table public.subscriptions add column if not exists payment_phone text;
alter table public.subscriptions add column if not exists grace_ends_at timestamptz;
alter table public.subscriptions add column if not exists renewal_attempts integer not null default 0;
alter table public.subscriptions add column if not exists last_renewal_attempt_at timestamptz;
alter table public.subscriptions add column if not exists last_renewal_notice_at timestamptz;
alter table public.subscriptions add column if not exists billing_interval text not null default 'month';
alter table public.subscriptions add column if not exists stripe_customer_id text;
alter table public.subscriptions add column if not exists stripe_subscription_id text;
alter table public.subscriptions add column if not exists provider text;

create index if not exists subscriptions_renewal_idx
  on public.subscriptions (status, current_period_end)
  where status in ('active', 'past_due', 'trialing');

create index if not exists subscriptions_stripe_sub_idx
  on public.subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

alter table public.subscription_payments add column if not exists kind text not null default 'initial';
alter table public.subscription_payments add column if not exists provider text not null default 'mpesa';
alter table public.subscription_payments add column if not exists attempt integer not null default 1;
alter table public.subscription_payments add column if not exists invoice_no text;
alter table public.subscription_payments add column if not exists period_start timestamptz;
alter table public.subscription_payments add column if not exists period_end timestamptz;

create index if not exists subscription_payments_checkout_idx
  on public.subscription_payments (checkout_request_id)
  where checkout_request_id is not null;

-- 2) ensure_subscription: security definer so it works after INSERT is revoked
create or replace function public.ensure_subscription(p_user uuid)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.subscriptions;
begin
  -- A signed-in caller may only ensure their own row. The service role (cron,
  -- webhooks) has no auth.uid() and may target any user explicitly.
  if auth.uid() is not null and auth.uid() <> p_user then
    raise exception 'forbidden';
  end if;

  select * into s from public.subscriptions where user_id = p_user;
  if not found then
    insert into public.subscriptions (user_id, plan_code, status, trial_ends_at, current_period_start)
    values (p_user, 'pro', 'trialing', now() + interval '14 days', now())
    on conflict (user_id) do nothing
    returning * into s;
    if s.id is null then
      select * into s from public.subscriptions where user_id = p_user;
    else
      insert into public.subscription_events (user_id, event, to_plan, to_status, reason, actor)
      values (p_user, 'created', 'pro', 'trialing', 'auto: signup', 'system');
    end if;
  end if;
  return s;
end;
$$;

revoke all on function public.ensure_subscription(uuid) from public;
grant execute on function public.ensure_subscription(uuid) to authenticated, service_role;

-- 3) subscription_status: grace-aware read model
create or replace function public.subscription_status(p_user uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  s public.subscriptions;
  p public.plans;
  trial_expired boolean;
  period_over boolean;
  in_grace boolean;
  effective_end timestamptz;
  active boolean;
  reason text;
begin
  select * into s from public.subscriptions where user_id = p_user;
  if not found then
    return jsonb_build_object(
      'has_subscription', false, 'is_active', false, 'is_trialing', false,
      'trial_expired', false, 'days_left', 0, 'plan', null, 'reason', 'no_subscription',
      'auto_renew', false, 'payment_method', null, 'period_end', null
    );
  end if;

  select * into p from public.plans where code = s.plan_code;

  trial_expired := s.status = 'trialing' and s.trial_ends_at is not null and s.trial_ends_at <= now();
  period_over := s.current_period_end is not null and s.current_period_end <= now();
  in_grace := s.status = 'past_due' and s.grace_ends_at is not null and s.grace_ends_at > now();

  active := s.status in ('active', 'trialing') and not trial_expired;
  if s.status = 'active' and period_over and not in_grace then
    active := false;
  end if;
  if s.status = 'past_due' then
    active := in_grace;
  end if;
  -- Cancelled at period end keeps access until cancel_at.
  if s.status = 'canceled' then
    active := s.cancel_at is not null and s.cancel_at > now();
  end if;

  reason := case
    when trial_expired and s.status = 'trialing' then 'trial_ended'
    when s.status = 'past_due' and not in_grace then 'past_due'
    when s.status = 'canceled' and active then 'canceled'
    when s.status = 'active' and period_over then 'renewal_due'
    else s.status
  end;

  effective_end := case
    when s.status = 'trialing' then s.trial_ends_at
    when s.status = 'past_due' then coalesce(s.grace_ends_at, s.current_period_end)
    when s.status = 'canceled' then s.cancel_at
    else s.current_period_end
  end;

  return jsonb_build_object(
    'has_subscription', true,
    'is_active', active,
    'is_trialing', s.status = 'trialing' and not trial_expired,
    'trial_expired', trial_expired,
    'is_past_due', s.status = 'past_due',
    'in_grace', in_grace,
    'days_left', case
      when active and effective_end is not null
        then greatest(0, ceil(extract(epoch from (effective_end - now())) / 86400))::int
      else 0 end,
    'plan', p.code,
    'plan_name', p.name,
    'price_kes', p.price_kes,
    'reason', reason,
    'trial_ends_at', s.trial_ends_at,
    'period_start', s.current_period_start,
    'period_end', s.current_period_end,
    'grace_ends_at', s.grace_ends_at,
    'auto_renew', coalesce(s.auto_renew, true),
    'payment_method', s.last_payment_method,
    'payment_phone', s.payment_phone,
    'renewal_attempts', coalesce(s.renewal_attempts, 0)
  );
end;
$$;

-- 4) billing_sync_status: move state forward. Safe to call repeatedly.
create or replace function public.billing_sync_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_trials integer := 0;
  moved_past_due integer := 0;
  expired_periods integer := 0;
  closed_cancellations integer := 0;
begin
  -- Trial ended without a payment.
  with changed as (
    update public.subscriptions
       set status = 'expired', updated_at = now()
     where status = 'trialing' and trial_ends_at is not null and trial_ends_at <= now()
     returning user_id, plan_code
  )
  insert into public.subscription_events (user_id, event, from_plan, to_plan, from_status, to_status, reason, actor)
  select user_id, 'expired', plan_code, plan_code, 'trialing', 'expired', 'trial_ended', 'system' from changed;
  get diagnostics expired_trials = row_count;

  -- A paid period ended: enter grace rather than cutting access instantly.
  with changed as (
    update public.subscriptions
       set status = 'past_due',
           grace_ends_at = coalesce(current_period_end, now()) + interval '3 days',
           updated_at = now()
     where status = 'active'
       and current_period_end is not null
       and current_period_end <= now()
     returning user_id, plan_code
  )
  insert into public.subscription_events (user_id, event, from_plan, to_plan, from_status, to_status, reason, actor)
  select user_id, 'payment_failed', plan_code, plan_code, 'active', 'past_due', 'period_ended', 'system' from changed;
  get diagnostics moved_past_due = row_count;

  -- Grace ended: access is paused.
  with changed as (
    update public.subscriptions
       set status = 'expired', updated_at = now()
     where status = 'past_due'
       and grace_ends_at is not null
       and grace_ends_at <= now()
     returning user_id, plan_code
  )
  insert into public.subscription_events (user_id, event, from_plan, to_plan, from_status, to_status, reason, actor)
  select user_id, 'expired', plan_code, plan_code, 'past_due', 'expired', 'grace_ended', 'system' from changed;
  get diagnostics expired_periods = row_count;

  -- Cancelled at period end.
  with changed as (
    update public.subscriptions
       set status = 'expired', updated_at = now()
     where status = 'canceled'
       and cancel_at is not null
       and cancel_at <= now()
     returning user_id, plan_code
  )
  insert into public.subscription_events (user_id, event, from_plan, to_plan, from_status, to_status, reason, actor)
  select user_id, 'expired', plan_code, plan_code, 'canceled', 'expired', 'cancellation_effective', 'system' from changed;
  get diagnostics closed_cancellations = row_count;

  return jsonb_build_object(
    'expired_trials', expired_trials,
    'moved_past_due', moved_past_due,
    'expired_periods', expired_periods,
    'closed_cancellations', closed_cancellations,
    'ran_at', now()
  );
end;
$$;

revoke all on function public.billing_sync_status() from public;
grant execute on function public.billing_sync_status() to service_role;

-- Keep the older entry point working, but route it through the new logic.
create or replace function public.expire_subscriptions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  result := public.billing_sync_status();
  return coalesce((result->>'expired_trials')::int, 0)
       + coalesce((result->>'moved_past_due')::int, 0)
       + coalesce((result->>'expired_periods')::int, 0);
end;
$$;

-- 5) grant_subscription_period: the ONLY way a payment activates/extends a plan.
--    Idempotent: a payment that is already active is never applied twice.
create or replace function public.grant_subscription_period(
  p_user uuid,
  p_payment_id uuid,
  p_days integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.subscriptions;
  pay public.subscription_payments;
  v_start timestamptz;
  v_end timestamptz;
  v_invoice text;
begin
  if p_days <= 0 or p_days > 366 then
    raise exception 'invalid period length';
  end if;

  select * into pay from public.subscription_payments where id = p_payment_id for update;
  if not found then
    raise exception 'payment not found';
  end if;
  if pay.user_id <> p_user then
    raise exception 'payment does not belong to user';
  end if;

  -- Already applied: return the current state without extending again.
  if pay.status in ('active', 'subscribed') then
    select * into s from public.subscriptions where user_id = p_user;
    return jsonb_build_object(
      'applied', false,
      'already_applied', true,
      'period_start', s.current_period_start,
      'period_end', s.current_period_end,
      'status', s.status
    );
  end if;

  select * into s from public.subscriptions where user_id = p_user for update;
  if not found then
    insert into public.subscriptions (user_id, plan_code, status)
    values (p_user, pay.plan_code, 'trialing')
    returning * into s;
  end if;

  -- A paid month starts when the current access ends (trial or paid period),
  -- so paying early never burns remaining days.
  v_start := greatest(
    now(),
    coalesce(s.current_period_end, 'epoch'::timestamptz),
    case when s.status = 'trialing' then coalesce(s.trial_ends_at, now()) else 'epoch'::timestamptz end
  );
  v_end := v_start + make_interval(days => p_days);
  v_invoice := 'PD-' || to_char(now(), 'YYYYMM') || '-' || upper(substr(replace(p_payment_id::text, '-', ''), 1, 8));

  update public.subscription_payments
     set status = 'active',
         completed_at = now(),
         invoice_no = coalesce(invoice_no, v_invoice),
         period_start = v_start,
         period_end = v_end
   where id = p_payment_id;

  update public.subscriptions
     set status = 'active',
         plan_code = pay.plan_code,
         current_period_start = v_start,
         current_period_end = v_end,
         grace_ends_at = null,
         renewal_attempts = 0,
         last_renewal_attempt_at = null,
         last_payment_id = p_payment_id,
         last_payment_method = coalesce(s.last_payment_method, pay.provider),
         payment_phone = coalesce(nullif(pay.phone, 'stripe'), s.payment_phone),
         updated_at = now()
   where user_id = p_user
   returning * into s;

  insert into public.subscription_events (user_id, event, from_plan, to_plan, from_status, to_status, days_granted, reason, actor, metadata)
  values (
    p_user, 'payment_succeeded', s.plan_code, pay.plan_code, 'past_due', 'active', p_days,
    coalesce(pay.kind, 'initial') || ' payment', 'system',
    jsonb_build_object('payment_id', p_payment_id, 'invoice_no', v_invoice, 'provider', pay.provider)
  );

  return jsonb_build_object(
    'applied', true,
    'period_start', v_start,
    'period_end', v_end,
    'status', 'active',
    'invoice_no', v_invoice
  );
end;
$$;

revoke all on function public.grant_subscription_period(uuid, uuid, integer) from public;
grant execute on function public.grant_subscription_period(uuid, uuid, integer) to service_role;

-- 6) User-initiated cancel / reactivate, without exposing the table.
create or replace function public.cancel_own_subscription()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.subscriptions;
  effective timestamptz;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select * into s from public.subscriptions where user_id = auth.uid() for update;
  if not found then raise exception 'subscription not found'; end if;
  if s.status in ('canceled', 'expired') then
    return jsonb_build_object('ok', true, 'status', s.status);
  end if;

  effective := coalesce(s.current_period_end, s.trial_ends_at, now());
  update public.subscriptions
     set status = 'canceled',
         canceled_at = now(),
         cancel_at = effective,
         auto_renew = false,
         updated_at = now()
   where user_id = auth.uid();

  insert into public.subscription_events (user_id, event, from_plan, to_plan, from_status, to_status, reason, actor)
  values (auth.uid(), 'canceled', s.plan_code, s.plan_code, s.status, 'canceled', 'user_request', auth.uid()::text);

  return jsonb_build_object('ok', true, 'status', 'canceled', 'access_until', effective);
end;
$$;

create or replace function public.reactivate_own_subscription()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.subscriptions;
  next_status text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select * into s from public.subscriptions where user_id = auth.uid() for update;
  if not found then raise exception 'subscription not found'; end if;

  next_status := case
    when s.status = 'trialing' then 'trialing'
    when s.current_period_end is not null and s.current_period_end > now() then 'active'
    else 'past_due'
  end;

  update public.subscriptions
     set status = next_status,
         canceled_at = null,
         cancel_at = null,
         auto_renew = true,
         grace_ends_at = case when next_status = 'past_due' then now() + interval '3 days' else null end,
         updated_at = now()
   where user_id = auth.uid();

  insert into public.subscription_events (user_id, event, from_plan, to_plan, from_status, to_status, reason, actor)
  values (auth.uid(), 'reactivated', s.plan_code, s.plan_code, s.status, next_status, 'user_request', auth.uid()::text);

  return jsonb_build_object('ok', true, 'status', next_status);
end;
$$;

revoke all on function public.cancel_own_subscription() from public;
revoke all on function public.reactivate_own_subscription() from public;
grant execute on function public.cancel_own_subscription() to authenticated;
grant execute on function public.reactivate_own_subscription() to authenticated;

-- 7) Renewal queue for M-Pesa subscribers --------------------------------
create or replace function public.billing_due_for_renewal(p_limit integer default 25)
returns table (
  user_id uuid,
  plan_code text,
  phone text,
  amount_kes integer,
  renewal_attempts integer,
  period_end timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select s.user_id,
         s.plan_code,
         coalesce(s.payment_phone, '') as phone,
         p.price_kes,
         coalesce(s.renewal_attempts, 0),
         s.current_period_end
    from public.subscriptions s
    join public.plans p on p.code = s.plan_code
   where s.status in ('active', 'past_due')
     and coalesce(s.auto_renew, true) = true
     and coalesce(s.last_payment_method, '') in ('mpesa_stk', 'mpesa_paybill')
     and coalesce(s.payment_phone, '') <> ''
     and s.current_period_end is not null
     and s.current_period_end <= now() + interval '2 days'
     and coalesce(s.renewal_attempts, 0) < 3
     and (s.last_renewal_attempt_at is null or s.last_renewal_attempt_at < now() - interval '20 hours')
     and not exists (
       select 1 from public.subscription_payments sp
        where sp.user_id = s.user_id
          and sp.status in ('initiated', 'pending')
          and sp.created_at > now() - interval '2 hours'
     )
   order by s.current_period_end asc
   limit greatest(1, least(p_limit, 100));
$$;

revoke all on function public.billing_due_for_renewal(integer) from public;
grant execute on function public.billing_due_for_renewal(integer) to service_role;

-- 8) Close the entitlement bypass ----------------------------------------
-- A signed-in user could update their own `subscriptions` row directly via
-- PostgREST (status = 'active', period_end far in the future). Entitlement
-- transitions now happen only through the service role / SECURITY DEFINER
-- functions above.
revoke insert, update, delete on public.subscriptions from anon, authenticated;
revoke insert, update, delete on public.subscription_payments from anon, authenticated;
revoke insert, update, delete on public.subscription_events from anon, authenticated;

drop policy if exists "subs_insert_self" on public.subscriptions;
drop policy if exists "subs_update_self" on public.subscriptions;
drop policy if exists "subscription_payments_insert_self" on public.subscription_payments;

-- ============================================================
-- 26-company-directory.sql
-- Company workspace: member directory, tokenised invitations,
-- presence, a native team calendar, and company-scoped
-- notifications.
--
-- Builds on `companies` + `team_members` (10-operations-module.sql).
-- Nothing existing is dropped or renamed — only added, and the two
-- RLS policies that were owner-only are widened so that a *member*
-- can read their own company (see section 2).
--
-- Idempotent: safe to re-run.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Helper functions
-- ------------------------------------------------------------
-- These three functions are the single source of truth for
-- "what can this user do in this company".
--
-- They are SECURITY DEFINER on purpose. A policy on `team_members`
-- that asks "is auth.uid() an active member of this company?" by
-- sub-selecting `team_members` would recurse into team_members' own
-- policy, and Postgres rejects that as an infinite-recursion error.
-- Running the lookup as the table owner (which bypasses RLS) breaks
-- the cycle without weakening the check.
--
-- `company_role` resolves the EFFECTIVE role:
--   - the company owner is always 'admin' (ownership is singular),
--   - an active team member's own role is used as-is,
--   - everyone else gets NULL.
create or replace function public.company_role(
  p_company_id uuid,
  p_user uuid default auth.uid()
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_user is null then null
    when exists (
      select 1 from public.companies c
      where c.id = p_company_id and c.owner_id = p_user
    ) then 'admin'
    else (
      select tm.role
      from public.team_members tm
      where tm.company_id = p_company_id
        and tm.user_id = p_user
        and tm.status = 'active'
      order by tm.invited_at asc
      limit 1
    )
  end;
$$;

create or replace function public.is_company_member(
  p_company_id uuid,
  p_user uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.company_role(p_company_id, p_user) is not null;
$$;

create or replace function public.is_company_admin(
  p_company_id uuid,
  p_user uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.company_role(p_company_id, p_user) in ('admin', 'manager');
$$;

revoke execute on function public.company_role(uuid, uuid) from public;
revoke execute on function public.is_company_member(uuid, uuid) from public;
revoke execute on function public.is_company_admin(uuid, uuid) from public;
grant execute on function public.company_role(uuid, uuid) to authenticated, service_role;
grant execute on function public.is_company_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.is_company_admin(uuid, uuid) to authenticated, service_role;

-- ------------------------------------------------------------
-- 1. team_members: profile fields
-- ------------------------------------------------------------
-- The directory renders a Slack-style row — circular avatar, a
-- presence dot, a department pill, a job title. None of that is
-- expressible with the original six columns.
alter table public.team_members
  add column if not exists avatar_url text,
  add column if not exists department text,
  add column if not exists job_title text,
  add column if not exists phone text,
  add column if not exists status text not null default 'active'
    check (status in ('active', 'suspended', 'removed')),
  add column if not exists last_seen_at timestamptz;

create index if not exists team_members_department_idx
  on public.team_members (company_id, department);

create index if not exists team_members_user_idx
  on public.team_members (user_id)
  where user_id is not null;

-- ------------------------------------------------------------
-- 2. Widen the company + directory read policies
-- ------------------------------------------------------------
-- BUG 2 in the build brief: `GET /api/company` was owner-only, so a
-- team member could not see their colleagues. The API is now
-- member-readable — but the API is not the only gate. The RLS
-- policies below were owner-only too, so a member would have hit an
-- empty directory even with a correct route. Both are widened here.
--
-- The company ROW itself also had to be widened: `companies_select_own`
-- only matched the owner, so a member could not even read the company
-- name they belong to.
drop policy if exists "companies_select_own" on public.companies;
create policy "companies_select_own" on public.companies
  for select using (
    auth.uid() = owner_id
    or public.is_company_member(id, auth.uid())
  );

-- Writing the company record (name, logo, address) stays owner-only.
drop policy if exists "companies_modify_own" on public.companies;
create policy "companies_modify_own" on public.companies
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "team_members_select_company" on public.team_members;
create policy "team_members_select_company" on public.team_members
  for select using (
    public.is_company_member(company_id, auth.uid())
  );

-- Membership rows are created by the invitation ACCEPTANCE path
-- (service role), never directly by a browser — so INSERT stays
-- owner-only. Admins may update roles/departments and remove rows.
drop policy if exists "team_members_modify_company" on public.team_members;
create policy "team_members_insert_owner" on public.team_members
  for insert with check (
    exists (
      select 1 from public.companies c
      where c.id = company_id and c.owner_id = auth.uid()
    )
  );

create policy "team_members_update_admin" on public.team_members
  for update using (
    public.is_company_admin(company_id, auth.uid())
  ) with check (
    public.is_company_admin(company_id, auth.uid())
  );

create policy "team_members_delete_admin" on public.team_members
  for delete using (
    public.is_company_admin(company_id, auth.uid())
  );

-- Managed landlords: admins and managers can read the portfolio too.
drop policy if exists "managed_landlords_select_company" on public.managed_landlords;
create policy "managed_landlords_select_company" on public.managed_landlords
  for select using (
    exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid())
    or user_id = auth.uid()
    or public.is_company_admin(company_id, auth.uid())
  );

-- ------------------------------------------------------------
-- 3. Invitations — pending state lives HERE, never in team_members
-- ------------------------------------------------------------
-- The previous flow wrote a team_members row the moment the owner
-- typed an email: no token, no expiry, no acceptance, no revoke.
-- A team_members row is now created ONLY when an invitee accepts a
-- valid, unexpired, single-use token.
create table if not exists public.company_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'agent'
    check (role in ('admin','manager','agent','accountant','viewer')),
  department text,
  job_title text,
  token_hash text not null,
  invited_by uuid references auth.users(id) on delete set null,
  invited_by_name text,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending','accepted','expired','revoked')),
  created_at timestamptz not null default now()
);

create index if not exists company_invitations_company_idx
  on public.company_invitations (company_id, status);

create index if not exists company_invitations_created_idx
  on public.company_invitations (company_id, created_at desc);

-- The raw token is never stored — only its SHA-256 hash. A database
-- reader must not be able to reconstruct a working invite link.
create unique index if not exists company_invitations_token_idx
  on public.company_invitations (token_hash);

-- At most one live invitation per email per company. Expired and
-- revoked rows are excluded, so a person can be re-invited later.
create unique index if not exists company_invitations_pending_email_idx
  on public.company_invitations (company_id, lower(email))
  where status = 'pending';

alter table public.company_invitations enable row level security;

drop policy if exists "invitations_select_admin" on public.company_invitations;
create policy "invitations_select_admin" on public.company_invitations
  for select using (
    public.is_company_admin(company_id, auth.uid())
  );

drop policy if exists "invitations_insert_admin" on public.company_invitations;
create policy "invitations_insert_admin" on public.company_invitations
  for insert with check (
    public.is_company_admin(company_id, auth.uid())
  );

drop policy if exists "invitations_update_admin" on public.company_invitations;
create policy "invitations_update_admin" on public.company_invitations
  for update using (
    public.is_company_admin(company_id, auth.uid())
  ) with check (
    public.is_company_admin(company_id, auth.uid())
  );

drop policy if exists "invitations_delete_admin" on public.company_invitations;
create policy "invitations_delete_admin" on public.company_invitations
  for delete using (
    public.is_company_admin(company_id, auth.uid())
  );

-- ------------------------------------------------------------
-- 4. Presence (last-seen fallback; Realtime is the primary layer)
-- ------------------------------------------------------------
create table if not exists public.company_presence (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'offline'
    check (status in ('online','away','offline')),
  last_heartbeat_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

alter table public.company_presence enable row level security;

drop policy if exists "presence_select_member" on public.company_presence;
create policy "presence_select_member" on public.company_presence
  for select using (
    public.is_company_member(company_id, auth.uid())
  );

-- A member may only ever write their OWN presence row.
drop policy if exists "presence_insert_own" on public.company_presence;
create policy "presence_insert_own" on public.company_presence
  for insert with check (
    user_id = auth.uid()
    and public.is_company_member(company_id, auth.uid())
  );

drop policy if exists "presence_update_own" on public.company_presence;
create policy "presence_update_own" on public.company_presence
  for update using (
    user_id = auth.uid()
    and public.is_company_member(company_id, auth.uid())
  ) with check (
    user_id = auth.uid()
    and public.is_company_member(company_id, auth.uid())
  );

-- ------------------------------------------------------------
-- 5. Calendar (native — no Google/Outlook sync in this build)
-- ------------------------------------------------------------
create table if not exists public.company_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  type text not null default 'meeting'
    check (type in ('meeting','viewing','inspection','holiday','focus')),
  property_id uuid references public.properties(id) on delete set null,
  location text,
  created_by uuid references auth.users(id) on delete set null,
  created_by_name text,
  visibility text not null default 'company'
    check (visibility in ('company','private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_events_range_idx
  on public.company_events (company_id, starts_at);

create index if not exists company_events_property_idx
  on public.company_events (property_id)
  where property_id is not null;

alter table public.company_events enable row level security;

drop policy if exists "events_select_member" on public.company_events;
create policy "events_select_member" on public.company_events
  for select using (
    public.is_company_member(company_id, auth.uid())
    and (
      visibility = 'company'
      or created_by = auth.uid()
      or public.is_company_admin(company_id, auth.uid())
    )
  );

-- Anyone who is not a viewer may add to the team calendar.
drop policy if exists "events_insert_member" on public.company_events;
create policy "events_insert_member" on public.company_events
  for insert with check (
    public.company_role(company_id, auth.uid()) in ('admin','manager','agent')
  );

-- Own events, or anything, for admins.
drop policy if exists "events_modify_creator_or_owner" on public.company_events;
create policy "events_modify_creator_or_owner" on public.company_events
  for update using (
    created_by = auth.uid()
    or public.is_company_admin(company_id, auth.uid())
  ) with check (
    created_by = auth.uid()
    or public.is_company_admin(company_id, auth.uid())
  );

create policy "events_delete_creator_or_owner" on public.company_events
  for delete using (
    created_by = auth.uid()
    or public.is_company_admin(company_id, auth.uid())
  );

-- ------------------------------------------------------------
-- 6. Notifications
-- ------------------------------------------------------------
-- Bower already has a notifications table (03-notifications.sql) with
-- user_id / type / title / message / severity / link / is_read /
-- metadata. This build EXTENDS that table with a company_id instead
-- of creating a parallel `company_notifications` table — two
-- notification stores would mean two bell components, two unread
-- counters and two places to forget RLS.
--
-- The existing RLS on `notifications` (`auth.uid() = user_id`) is
-- already correct for company notifications: every row belongs to
-- exactly one recipient. Only the column and its index are added.
do $$
begin
  if to_regclass('public.notifications') is not null then
    alter table public.notifications
      add column if not exists company_id uuid references public.companies(id) on delete cascade;
    create index if not exists notifications_company_idx
      on public.notifications (company_id, created_at desc)
      where company_id is not null;
  else
    raise notice 'public.notifications is not installed — skipping company_id extension';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 6b. Personal profile: avatar + self-service edits
-- ------------------------------------------------------------
-- A person's own profile lives in `user_profiles` (it already exists and
-- already drives the sidebar name). The company directory shows the
-- membership row; the two are kept in step when somebody edits their
-- own details.
--
-- `avatar_url` is added here because there was nowhere to put a
-- profile photo before this migration.
do $$
begin
  if to_regclass('public.user_profiles') is not null then
    alter table public.user_profiles
      add column if not exists avatar_url text;
  else
    raise notice 'public.user_profiles is not installed — skipping avatar_url';
  end if;
end;
$$;

-- Avatars are not sensitive: the bucket is public, like every other
-- profile photo on the internet. The folder structure keeps each
-- person's images under their own user id.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

drop policy if exists "avatars_read_public" on storage.objects;
create policy "avatars_read_public" on storage.objects
  for select using (bucket_id = 'avatars');

-- Defence in depth for self-service profile edits.
--
-- The API route writes through the service role with an explicit field
-- allowlist, so a member can never promote themselves. This trigger
-- closes the other door: even if somebody reaches PostgREST directly
-- with the anon key, a member updating their OWN row may change their
-- name, photo and contact details — never their role, their status, or
-- which company they belong to.
create or replace function public.guard_team_member_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and auth.uid() = old.user_id
     and not public.is_company_admin(old.company_id, auth.uid()) then
    if new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.company_id is distinct from old.company_id
       or new.user_id is distinct from old.user_id then
      raise exception 'self_profile_update_forbidden';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_team_member_self_update on public.team_members;
create trigger guard_team_member_self_update
before update on public.team_members
for each row execute function public.guard_team_member_self_update();

-- ------------------------------------------------------------
-- 7. Realtime publication
-- ------------------------------------------------------------
-- The notification bell and the calendar subscribe to postgres_changes
-- on these tables. A table only emits changes if it is in the
-- `supabase_realtime` publication. The block is guarded so a database
-- without the publication (or without permission to alter it) does
-- not fail the whole migration.
do $$
begin
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then null;
  when others then
    raise notice 'could not add public.notifications to supabase_realtime: %', sqlerrm;
  end;
  begin
    alter publication supabase_realtime add table public.company_events;
  exception when duplicate_object then null;
  when others then
    raise notice 'could not add public.company_events to supabase_realtime: %', sqlerrm;
  end;
end;
$$;

-- ------------------------------------------------------------
-- 8. Accepting an invitation — one atomic transaction
-- ------------------------------------------------------------
-- Accepting an invitation does three things that must not come
-- apart: create the membership, mark the invitation used, and tell
-- the inviter. If any one of them fails, the invitee must not end
-- up half-joined, and the token must not stay redeemable.
--
-- A plain sequence of three queries cannot guarantee that, so the
-- whole thing lives in one SECURITY DEFINER function. The row lock
-- on the invitation is what makes the token single-use: two
-- concurrent redemptions serialise here, and the second one sees
-- status = 'accepted' and fails.
--
-- The function is callable only by the service role. The public
-- accept route does the user-facing validation (password rules,
-- account creation, session checks) before calling it.
create or replace function public.accept_company_invitation(
  p_token_hash text,
  p_user_id uuid,
  p_name text default null,
  p_department text default null,
  p_job_title text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.company_invitations;
  v_company public.companies;
  v_member_id uuid;
  v_member_name text;
begin
  if p_user_id is null then
    raise exception 'invitation_user_required';
  end if;

  select * into v_invitation
    from public.company_invitations
   where token_hash = p_token_hash
   for update;

  if not found then
    raise exception 'invitation_not_found';
  end if;

  if v_invitation.status <> 'pending' then
    raise exception 'invitation_not_pending';
  end if;

  if v_invitation.expires_at <= now() then
    update public.company_invitations
       set status = 'expired'
     where id = v_invitation.id;
    raise exception 'invitation_expired';
  end if;

  select * into v_company from public.companies where id = v_invitation.company_id;
  if not found then
    raise exception 'invitation_company_missing';
  end if;

  v_member_name := coalesce(
    nullif(btrim(p_name), ''),
    nullif(btrim(v_invitation.name), ''),
    split_part(v_invitation.email, '@', 1)
  );

  insert into public.team_members (
    company_id, user_id, name, email, role, department, job_title, status, accepted_at
  )
  values (
    v_invitation.company_id,
    p_user_id,
    v_member_name,
    v_invitation.email,
    v_invitation.role,
    coalesce(nullif(btrim(p_department), ''), v_invitation.department),
    coalesce(nullif(btrim(p_job_title), ''), v_invitation.job_title),
    'active',
    now()
  )
  on conflict (company_id, email) do update
    set user_id = excluded.user_id,
        name = excluded.name,
        role = excluded.role,
        department = excluded.department,
        job_title = excluded.job_title,
        status = 'active',
        accepted_at = now()
  returning id into v_member_id;

  update public.company_invitations
     set status = 'accepted',
         accepted_at = now(),
         accepted_by = p_user_id
   where id = v_invitation.id;

  -- Tell the person who sent the invitation.
  if v_invitation.invited_by is not null then
    insert into public.notifications (
      company_id, user_id, type, title, message, severity, link, is_read, metadata
    )
    values (
      v_invitation.company_id,
      v_invitation.invited_by,
      'invite_accepted',
      v_member_name || ' joined ' || v_company.name,
      v_member_name || ' accepted your invitation and is now part of the team.',
      'success',
      '/dashboard/company',
      false,
      jsonb_build_object(
        'company_id', v_invitation.company_id,
        'member_name', v_member_name,
        'member_email', v_invitation.email,
        'role', v_invitation.role
      )
    );
  end if;

  return jsonb_build_object(
    'company_id', v_invitation.company_id,
    'company_name', v_company.name,
    'company_slug', v_company.slug,
    'member_id', v_member_id,
    'role', v_invitation.role,
    'member_name', v_member_name
  );
end;
$$;

revoke execute on function public.accept_company_invitation(text, uuid, text, text, text) from public;
revoke execute on function public.accept_company_invitation(text, uuid, text, text, text) from anon;
revoke execute on function public.accept_company_invitation(text, uuid, text, text, text) from authenticated;
grant execute on function public.accept_company_invitation(text, uuid, text, text, text) to service_role;

-- Make PostgREST pick up the new tables, columns and functions without
-- waiting for its schema cache to expire on its own.
notify pgrst, 'reload schema';

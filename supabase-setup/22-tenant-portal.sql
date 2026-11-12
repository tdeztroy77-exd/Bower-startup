-- ============================================================
-- 22-tenant-portal.sql
--
-- Tenant self-service access.
--
-- A landlord issues a single-use, expiring link for one tenant. The link is
-- stored as a SHA-256 hash, scoped to that tenant, and can be revoked. The
-- tenant can then see their own statement, pay an invoice and raise a
-- maintenance request without creating an account.
--
-- Idempotent. Safe to re-run.
-- ============================================================

create table if not exists public.tenant_portal_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists tenant_portal_tokens_tenant_idx
  on public.tenant_portal_tokens (tenant_id, created_at desc);

create index if not exists tenant_portal_tokens_hash_idx
  on public.tenant_portal_tokens (token_hash)
  where revoked_at is null;

alter table public.tenant_portal_tokens enable row level security;

-- No policies: the browser has no access at all. Both issuing and resolving a
-- token happen server-side with the service role.
revoke all on public.tenant_portal_tokens from anon, authenticated;

-- Portal-created maintenance requests are attributed to the landlord and the
-- tenant, and the portal only ever inserts through the service role.
comment on table public.tenant_portal_tokens is
  'Hashed, expiring tenant portal links. Service-role access only.';

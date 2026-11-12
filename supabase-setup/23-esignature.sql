-- ============================================================
-- 23-esignature.sql
--
-- Simple electronic signatures for generated documents.
--
-- A signing request is created by the landlord, sent as a private link, and
-- completed by the tenant by typing their name and consenting. Every view and
-- the signature itself are recorded with a timestamp, IP and user agent.
-- The signed .docx is stored with the request and its hash recorded, so a
-- later edit is detectable.
--
-- Idempotent. Safe to re-run.
-- ============================================================

create table if not exists public.esign_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  template_id text not null,
  fields jsonb not null default '{}'::jsonb,
  status text not null default 'sent'
    check (status in ('sent', 'viewed', 'signed', 'void')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  signer_name text,
  signer_email text,
  signer_ip text,
  signer_agent text,
  document_hash text,
  signed_docx text,
  viewed_at timestamptz,
  signed_at timestamptz,
  voided_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists esign_requests_tenant_idx
  on public.esign_requests (tenant_id, created_at desc);
create index if not exists esign_requests_hash_idx
  on public.esign_requests (token_hash)
  where status <> 'void';

alter table public.esign_requests enable row level security;
revoke all on public.esign_requests from anon, authenticated;

create table if not exists public.esign_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.esign_requests(id) on delete cascade,
  event text not null,
  name text,
  email text,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists esign_events_request_idx
  on public.esign_events (request_id, created_at);

alter table public.esign_events enable row level security;
revoke all on public.esign_events from anon, authenticated;

comment on table public.esign_requests is
  'Electronic signature requests. Service-role access only; the link token is stored hashed.';

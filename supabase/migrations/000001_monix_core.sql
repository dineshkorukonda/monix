-- Monix serverless schema (Supabase Postgres). Apply after migrating data from Django.
-- RLS policies should map auth.uid()::text to monix user rows where applicable.

create extension if not exists "pgcrypto";

-- Application user profile keyed by Supabase Auth user id (JWT `sub`).
create table if not exists public.monix_users (
  id uuid primary key,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Monitored targets (replaces reports_target; owner is Supabase user id).
create table if not exists public.monix_targets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.monix_users (id) on delete cascade,
  url text not null,
  environment text not null default '',
  gsc_property_url text not null default '',
  gsc_analytics jsonb,
  gsc_synced_at timestamptz,
  gsc_sync_error text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists monix_targets_owner_idx on public.monix_targets (owner_id);

-- Scan results (replaces reports_scan).
create table if not exists public.monix_scans (
  id bigserial primary key,
  target_id uuid references public.monix_targets (id) on delete set null,
  report_id uuid not null unique,
  url text not null,
  score smallint not null check (score >= 0 and score <= 100),
  results jsonb not null,
  is_expired boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists monix_scans_report_id_idx on public.monix_scans (report_id);

-- Google Search Console OAuth tokens (encrypted at rest; same semantics as Django model).
create table if not exists public.monix_gsc_credentials (
  user_id uuid primary key references public.monix_users (id) on delete cascade,
  refresh_token_encrypted text not null,
  access_token text not null default '',
  access_token_expires_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Cloudflare API token (encrypted at rest).
create table if not exists public.monix_cloudflare_credentials (
  user_id uuid primary key references public.monix_users (id) on delete cascade,
  api_token_encrypted text not null,
  account_id text not null default '',
  account_name text not null default '',
  zones_count integer not null default 0 check (zones_count >= 0),
  updated_at timestamptz not null default now()
);

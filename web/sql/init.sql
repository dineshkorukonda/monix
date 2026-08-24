-- Monix Database Schema
-- Standalone unauthenticated website intelligence & diagnostic platform.

create extension if not exists "pgcrypto";

create table if not exists public.monix_scans (
  id bigserial primary key,
  report_id uuid not null unique,
  public_slug text unique,
  trigger text not null default 'anonymous',
  url text not null,
  score smallint not null check (score >= 0 and score <= 100),
  results jsonb not null,
  is_expired boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists monix_scans_report_id_idx on public.monix_scans (report_id);
create index if not exists monix_scans_public_slug_idx on public.monix_scans (public_slug);

create table if not exists public.monix_rate_limits (
  id bigserial primary key,
  ip_address text not null,
  window_start timestamptz not null default now(),
  request_count integer not null default 1
);

create index if not exists monix_rate_limits_ip_window_idx on public.monix_rate_limits (ip_address, window_start);

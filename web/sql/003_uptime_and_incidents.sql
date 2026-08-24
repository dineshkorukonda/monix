-- Migration: Add uptime_checks and incidents tables

create table if not exists public.uptime_checks (
  id bigserial primary key,
  site_id uuid not null references public.monix_targets(id) on delete cascade,
  checked_at timestamptz not null default now(),
  status text not null check (status in ('up', 'down')),
  response_time_ms integer,
  status_code integer
);

create index if not exists uptime_checks_site_checked_at_idx on public.uptime_checks (site_id, checked_at desc);

create table if not exists public.incidents (
  id bigserial primary key,
  site_id uuid not null references public.monix_targets(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  cause text
);

create index if not exists incidents_site_started_at_idx on public.incidents (site_id, started_at desc);
create index if not exists incidents_active_idx on public.incidents (site_id) where ended_at is null;

-- Migration: Add rate limits table
create table if not exists public.monix_rate_limits (
  id bigserial primary key,
  ip_address text not null,
  window_start timestamptz not null default now(),
  request_count integer not null default 1
);

create index if not exists monix_rate_limits_ip_window_idx on public.monix_rate_limits (ip_address, window_start);

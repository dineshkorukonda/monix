-- Migration: Add public_status_page and status_slug to monix_targets
alter table public.monix_targets add column if not exists public_status_page boolean not null default false;
alter table public.monix_targets add column if not exists status_slug text unique;

create index if not exists monix_targets_status_slug_idx on public.monix_targets (status_slug);


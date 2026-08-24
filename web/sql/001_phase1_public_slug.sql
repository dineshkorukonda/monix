-- Migration: Add public_slug and trigger to monix_scans
alter table public.monix_scans add column if not exists public_slug text unique;
alter table public.monix_scans add column if not exists trigger text not null default 'anonymous';
create index if not exists monix_scans_public_slug_idx on public.monix_scans (public_slug);

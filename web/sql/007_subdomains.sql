-- Migration: Create subdomains table
create table if not exists public.subdomains (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null references public.monix_targets(id) on delete cascade,
  subdomain text not null,
  ip_addresses text[] not null default '{}',
  http_status integer,
  is_live boolean not null default false,
  discovered_at timestamptz not null default now(),
  last_probed_at timestamptz not null default now(),
  unique (target_id, subdomain)
);

create index if not exists subdomains_target_id_idx on public.subdomains (target_id);
create index if not exists subdomains_subdomain_idx on public.subdomains (subdomain);


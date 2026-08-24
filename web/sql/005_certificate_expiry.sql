-- Migration: Add certificate_expiry_at, cert_issuer, and cert_warning_days to monix_targets
alter table public.monix_targets add column if not exists certificate_expiry_at timestamptz;
alter table public.monix_targets add column if not exists cert_issuer text;
alter table public.monix_targets add column if not exists cert_warning_days integer not null default 14;


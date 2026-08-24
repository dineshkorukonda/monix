-- Migration: Add webhook_url to monix_targets
alter table public.monix_targets add column if not exists webhook_url text;


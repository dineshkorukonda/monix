alter table public.monix_users
  add column if not exists first_name text not null default '',
  add column if not exists last_name text not null default '';

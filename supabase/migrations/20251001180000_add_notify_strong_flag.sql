-- add flag to control strong notifications opt-in
alter table public.items
  add column if not exists notify_strong boolean not null default false;

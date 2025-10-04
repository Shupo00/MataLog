-- Add scheduling fields for notification processing
alter table public.items
  add column if not exists next_primary_fire_at timestamptz,
  add column if not exists next_strong_fire_at timestamptz,
  add column if not exists last_primary_notified_at timestamptz,
  add column if not exists last_strong_notified_at timestamptz;

create index if not exists items_next_primary_fire_idx
  on public.items(next_primary_fire_at);

create index if not exists items_next_strong_fire_idx
  on public.items(next_strong_fire_at);

create index if not exists items_last_primary_notified_idx
  on public.items(last_primary_notified_at desc);

create index if not exists items_last_strong_notified_idx
  on public.items(last_strong_notified_at desc);

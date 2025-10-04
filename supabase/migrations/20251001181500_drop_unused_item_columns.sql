alter table public.items
    drop column if exists window_center_days,
    drop column if exists window_width_days,
    drop column if exists snooze,
    drop column if exists last_primary_notified_at,
    drop column if exists last_strong_notified_at;

  drop index if exists items_last_primary_notified_idx;
  drop index if exists items_last_strong_notified_idx;

  alter table public.items drop constraint if exists items_cadence_mode_check;
  alter table public.items add constraint items_cadence_mode_check check (cadence_mode in ('adaptive','fixed'));
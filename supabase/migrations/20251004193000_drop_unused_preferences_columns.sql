-- Drop unused columns from preferences and align defaults with email-only notifications

alter table public.preferences
  drop column if exists notify_hour_start,
  drop column if exists notify_hour_end,
  drop column if exists dnd_start,
  drop column if exists dnd_end,
  drop column if exists weekly_digest_weekday,
  drop column if exists timezone;

alter table public.preferences
  alter column notify_channel set default 'email';

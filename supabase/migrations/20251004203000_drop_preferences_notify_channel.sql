-- Drop notify_channel column from preferences (email-only notifications)

alter table public.preferences
  drop column if exists notify_channel;

-- Drop obsolete notify_web_push column from items

alter table public.items
  drop column if exists notify_web_push;

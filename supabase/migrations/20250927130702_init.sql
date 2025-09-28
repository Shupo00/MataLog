-- Helper function to keep updated_at in sync
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

-- Profiles table (one-to-one with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Items that the user is tracking
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default ''::text,
  icon text,
  cadence_mode text not null default 'adaptive' check (cadence_mode in ('adaptive','fixed','window')),
  tau_days numeric(8,2),
  fixed_days numeric(8,2),
  window_center_days numeric(8,2),
  window_width_days numeric(8,2),
  notifications_enabled boolean not null default true,
  notify_web_push boolean not null default true,
  notify_email boolean not null default false,
  threshold_primary smallint not null default 70 check (threshold_primary between 0 and 100),
  threshold_strong smallint not null default 85 check (threshold_strong between 0 and 100),
  snooze text not null default 'none' check (snooze in ('none','day','week','month')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists items_user_id_idx on public.items(user_id);
create index if not exists items_cadence_mode_idx on public.items(cadence_mode);

create trigger set_items_updated_at
before update on public.items
for each row execute function public.set_updated_at();

-- Activity logs
create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  logged_at timestamptz not null default timezone('utc', now()),
  satisfaction smallint check (satisfaction between 0 and 100),
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists logs_user_id_idx on public.logs(user_id);
create index if not exists logs_item_id_idx on public.logs(item_id);
create index if not exists logs_logged_at_idx on public.logs(logged_at desc);

-- User level notification / cadence defaults
create table if not exists public.preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  primary_threshold_default smallint not null default 70 check (primary_threshold_default between 0 and 100),
  strong_threshold_default smallint not null default 85 check (strong_threshold_default between 0 and 100),
  notify_hour_start smallint not null default 9 check (notify_hour_start between 0 and 23),
  notify_hour_end smallint not null default 21 check (notify_hour_end between 0 and 23),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_preferences_updated_at
before update on public.preferences
for each row execute function public.set_updated_at();

-- Outbound notification queue
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  channel text not null check (channel in ('webpush','email')),
  level text not null check (level in ('primary','strong')),
  score smallint check (score between 0 and 100),
  send_at timestamptz not null,
  delivered_at timestamptz,
  payload jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists notifications_user_send_at_idx on public.notifications(user_id, send_at);
create index if not exists notifications_delivery_idx on public.notifications(delivered_at);

-- Web push subscriptions
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default timezone('utc', now()),
  last_used_at timestamptz
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

-- Row Level Security Policies ------------------------------------------------

alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.logs enable row level security;
alter table public.preferences enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

-- Profiles RLS
drop policy if exists "Profiles are editable by owner" on public.profiles;
create policy "Profiles are editable by owner"
  on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Items RLS
drop policy if exists "Users can view their items" on public.items;
create policy "Users can view their items"
  on public.items
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their items" on public.items;
create policy "Users can insert their items"
  on public.items
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their items" on public.items;
create policy "Users can update their items"
  on public.items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their items" on public.items;
create policy "Users can delete their items"
  on public.items
  for delete
  using (auth.uid() = user_id);

-- Logs RLS
drop policy if exists "Users can read their logs" on public.logs;
create policy "Users can read their logs"
  on public.logs
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert logs" on public.logs;
create policy "Users can insert logs"
  on public.logs
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their logs" on public.logs;
create policy "Users can update their logs"
  on public.logs
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their logs" on public.logs;
create policy "Users can delete their logs"
  on public.logs
  for delete
  using (auth.uid() = user_id);

-- Preferences RLS
drop policy if exists "Users manage their preferences" on public.preferences;
create policy "Users manage their preferences"
  on public.preferences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Notifications RLS
drop policy if exists "Users can view their notifications" on public.notifications;
create policy "Users can view their notifications"
  on public.notifications
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can manage their notifications" on public.notifications;
create policy "Users can manage their notifications"
  on public.notifications
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Push subscriptions RLS
drop policy if exists "Users can view their push subscriptions" on public.push_subscriptions;
create policy "Users can view their push subscriptions"
  on public.push_subscriptions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can manage their push subscriptions" on public.push_subscriptions;
create policy "Users can manage their push subscriptions"
  on public.push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
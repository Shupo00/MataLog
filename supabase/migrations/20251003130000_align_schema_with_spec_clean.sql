-- Align schema with notification cadence specification

-- Rename legacy cadence fields
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'fixed_days'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'cadence_days'
  ) THEN
    EXECUTE 'ALTER TABLE public.items RENAME COLUMN fixed_days TO cadence_days';
  END IF;
END;
$$;

-- Ensure tau_days has a reasonable default
ALTER TABLE public.items
  ALTER COLUMN tau_days SET DEFAULT 3;

-- Rename next fire columns to the new naming convention
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'next_primary_fire_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'next_fire_at_primary'
  ) THEN
    EXECUTE 'ALTER TABLE public.items RENAME COLUMN next_primary_fire_at TO next_fire_at_primary';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'next_strong_fire_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'next_fire_at_strong'
  ) THEN
    EXECUTE 'ALTER TABLE public.items RENAME COLUMN next_strong_fire_at TO next_fire_at_strong';
  END IF;
END;
$$;

-- Refresh indexes for next fire columns and user/category lookups
DROP INDEX IF EXISTS items_next_primary_fire_idx;
DROP INDEX IF EXISTS items_next_strong_fire_idx;
DROP INDEX IF EXISTS items_user_id_idx;
CREATE INDEX IF NOT EXISTS idx_items_next_fire_primary ON public.items(next_fire_at_primary);
CREATE INDEX IF NOT EXISTS idx_items_next_fire_strong ON public.items(next_fire_at_strong);
CREATE INDEX IF NOT EXISTS idx_items_user_category ON public.items(user_id, category);

-- Tighten notify_strong default
ALTER TABLE public.items
  ALTER COLUMN notify_strong SET DEFAULT false;
UPDATE public.items SET notify_strong = COALESCE(notify_strong, false);

-- Rename logs.logged_at to logs.at and refresh indexes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'logs' AND column_name = 'logged_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'logs' AND column_name = 'at'
  ) THEN
    EXECUTE 'ALTER TABLE public.logs RENAME COLUMN logged_at TO at';
  END IF;
END;
$$;

DROP INDEX IF EXISTS logs_logged_at_idx;
DROP INDEX IF EXISTS logs_item_id_idx;
CREATE INDEX IF NOT EXISTS idx_logs_item_at_desc ON public.logs(item_id, at DESC);

-- Preferences enrichment
ALTER TABLE public.preferences
  ADD COLUMN IF NOT EXISTS dnd_start time,
  ADD COLUMN IF NOT EXISTS dnd_end time,
  ADD COLUMN IF NOT EXISTS weekly_digest_weekday int,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS notify_channel text NOT NULL DEFAULT 'both' CHECK (notify_channel IN ('webpush','email','both'));

UPDATE public.preferences
SET timezone = COALESCE(timezone, 'UTC'),
    notify_channel = COALESCE(notify_channel, 'both');

-- Push subscription enhancements
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'push_subscriptions' AND column_name = 'last_used_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'push_subscriptions' AND column_name = 'last_success_at'
  ) THEN
    EXECUTE 'ALTER TABLE public.push_subscriptions RENAME COLUMN last_used_at TO last_success_at';
  END IF;
END;
$$;

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

DROP INDEX IF EXISTS push_subscriptions_user_id_idx;
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_active ON public.push_subscriptions(user_id, is_active);

-- Notifications table additions
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS delivered boolean;
ALTER TABLE public.notifications
  ALTER COLUMN delivered SET DEFAULT false;
UPDATE public.notifications
SET delivered = COALESCE(delivered, false);
ALTER TABLE public.notifications
  ALTER COLUMN delivered SET NOT NULL;

-- Compute next fire helper function
CREATE OR REPLACE FUNCTION public.compute_next_fire(
  last_at timestamptz,
  sigma_hours numeric,
  threshold integer
) RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN last_at IS NULL OR sigma_hours IS NULL OR threshold IS NULL THEN NULL
    WHEN sigma_hours <= 0 OR threshold <= 0 OR threshold >= 100 THEN NULL
    ELSE last_at + ((- sigma_hours * LN(1 - threshold::numeric / 100)) || ' hours')::interval
  END;
$$;

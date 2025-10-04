
-- Ensure every item has a concrete cadence value
alter table public.items
  alter column cadence_days set default 7;

update public.items
   set cadence_days = coalesce(cadence_days, 7);

alter table public.items
  alter column cadence_days set not null;

-- Drop adaptive-specific columns and artifacts
alter table public.items
  drop column if exists tau_days,
  drop column if exists cadence_mode;

alter table public.items drop constraint if exists items_cadence_mode_check;

drop index if exists items_cadence_mode_idx;

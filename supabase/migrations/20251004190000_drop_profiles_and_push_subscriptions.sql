-- Drop unused profiles and push_subscriptions tables

-- Clean up profiles table artifacts
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
DROP POLICY IF EXISTS "Profiles are editable by owner" ON public.profiles;
DROP TABLE IF EXISTS public.profiles;

-- Clean up push_subscriptions table artifacts
DROP POLICY IF EXISTS "Users can view their push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can manage their push subscriptions" ON public.push_subscriptions;
DROP INDEX IF EXISTS idx_push_subscriptions_user_active;
DROP INDEX IF EXISTS push_subscriptions_user_id_idx;
DROP TABLE IF EXISTS public.push_subscriptions;

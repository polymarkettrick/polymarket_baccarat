-- Create the user_profiles table if it doesn't already exist
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits integer NOT NULL DEFAULT 10,
  -- If you already created this table in an earlier phase, running CREATE TABLE again fails. 
  -- The following columns will be added below safely via ALTER TABLE.
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id)
);

-- Safely add the new Membership & Timeout columns if they don't exist yet
ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS membership_tier varchar NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS membership_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_credit_reset_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS contact_email varchar;

-- Enable Row Level Security (RLS) so users can securely query their own profile from the Chrome Extension
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" 
  ON public.user_profiles 
  FOR SELECT 
  USING (auth.uid() = id);

-- Trigger: Automatically create a profile with 10 credits when a new user Signs Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, credits, contact_email)
  VALUES (new.id, 10, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Enable pg_cron for 12:00 GMT daily reset
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove the old client-side RPC function which caused race-conditions
DROP FUNCTION IF EXISTS claim_daily_credits();

-- Create the pg_cron job to safely execute exactly at 12:00 GMT every day
SELECT cron.schedule(
  'reset_free_credits_gmt', 
  '0 12 * * *', 
  $$ UPDATE public.user_profiles SET credits = 10, last_credit_reset_at = now() WHERE membership_tier = 'free' $$
);

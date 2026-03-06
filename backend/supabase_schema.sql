-- Create the user_profiles table to store credits
CREATE TABLE public.user_profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits integer NOT NULL DEFAULT 10,
  last_login_date date NOT NULL DEFAULT CURRENT_DATE,
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id)
);

-- Enable Row Level Security (RLS) so users can securely query their own profile from the Chrome Extension
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
  ON public.user_profiles 
  FOR SELECT 
  USING (auth.uid() = id);

-- Trigger: Automatically create a profile with 10 credits when a new user Signs Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, credits, last_login_date)
  VALUES (new.id, 10, CURRENT_DATE);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RPC Function: Extension calls this every time it boots to check for the Daily 10 Credit Reset
CREATE OR REPLACE FUNCTION claim_daily_credits()
RETURNS public.user_profiles AS $$
DECLARE
  profile_record public.user_profiles;
BEGIN
  -- First, get the current profile
  SELECT * INTO profile_record FROM public.user_profiles WHERE id = auth.uid();
  
  -- Check if they logged in on a different day than their last record
  IF profile_record.last_login_date < CURRENT_DATE THEN
    -- If so, strictly reset their credits to 10 and update the date.
    UPDATE public.user_profiles 
    SET credits = 10, last_login_date = CURRENT_DATE 
    WHERE id = auth.uid()
    RETURNING * INTO profile_record;
  END IF;
  
  RETURN profile_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
